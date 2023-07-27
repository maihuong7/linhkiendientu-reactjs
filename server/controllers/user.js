const User = require("../models/user");
const Product = require("../models/product");
const Cart = require("../models/cart");
const Coupon = require("../models/coupon");
const Order = require("../models/order");
const uniqid = require("uniqid");

var fs = require('fs');
// var json2csv = require('json2csv').parse;

exports.userCart = async (req, res) => {
  // console.log(req.body); // {cart: []}
  const { cart } = req.body;

  let products = [];

  const user = await User.findOne({ email: req.user.email }).exec();

  // check if cart with logged in user id already exist
  let cartExistByThisUser = await Cart.findOne({ orderedBy: user._id }).exec();

  if (cartExistByThisUser) {
    cartExistByThisUser.remove();
    console.log("remove old cart");
  }

  for (let i = 0; i < cart.length; i++) {
    let object = {};

    object.product = cart[i]._id;
    object.count = cart[i].count;
    object.topping = cart[i].topping;

    // get price for getting total
    let productFromDb = await Product.findById(cart[i]._id)
      .select("price")
      .exec();

    object.price = productFromDb.price;

    products.push(object);
  }

  // console.log("products", products);
  let cartTotal = 0;
  for (let i = 0; i < products.length; i++) {
    cartTotal = cartTotal + products[i].price * products[i].count;
  }

  // console.log("cartTotal", cartTotal)
  let newCart = await new Cart({
    products,
    cartTotal,
    orderedBy: user._id,
  }).save();

  console.log("new cart", newCart);
  res.json({ ok: true });
};

exports.getUserCart = async (req, res) => {
  const user = await User.findOne({ email: req.user.email }).exec();

  let cart = await Cart.findOne({ orderedBy: user._id })
    .populate("products.product", "_id title price totalAfterDiscount")
    .exec();

  const { products, cartTotal, totalAfterDiscount } = cart;
  res.json({ products, cartTotal, totalAfterDiscount });
};

exports.emptyCart = async (req, res) => {
  console.log("empty cart");
  const user = await User.findOne({ email: req.user.email }).exec();

  const cart = await Cart.findOneAndRemove({ orderedBy: user._id }).exec();
  res.json(cart);
};

exports.saveAddress = async (req, res) => {
  const userAddress = await User.findOneAndUpdate(
    { email: req.user.email },
    { address: req.body.address }
  ).exec();

  res.json({ ok: true });
};

exports.getAddress = async (req, res) => {
  const address = await User.findOne({ email: req.user.email }).exec();

  res.json(address);
};

exports.applyCouponToUserCart = async (req, res) => {
  const { coupon } = req.body;
  console.log("COUPON", coupon);

  const validCoupon = await Coupon.findOne({ name: coupon }).exec();
  if (validCoupon === null) {
    return res.json({
      err: "Mã giảm giá không tồn tại",
    });
  }
  console.log("VALID COUPON", validCoupon);
  if (new Date() > validCoupon.expiry)
  return res.json({
    err: "Mã giảm giá đã hết hạn",
  });

  const user = await User.findOne({ email: req.user.email }).exec();

  let { products, cartTotal } = await Cart.findOne({ orderedBy: user._id })
    .populate("products.product", "_id title price")
    .exec();

  console.log("cartTotal", cartTotal, "discount", validCoupon.discount);

  // calculate after discount
  let totalAfterDiscount = (
    cartTotal -
    (cartTotal * validCoupon.discount) / 100
  ).toFixed(0);

  console.log("------------>", totalAfterDiscount);

  Cart.findOneAndUpdate(
    { orderedBy: user._id },
    { totalAfterDiscount },
    { new: true }
  ).exec();

  res.json(totalAfterDiscount);
};

exports.createOrder = async (req, res) => {
  const { paymentIntent } = req.body.stripeResponse;
  const user = await User.findOne({
    email: req.user.email,
  }).exec();

  let { address } = await User.findOne({ email: req.user.email }).exec();

  let { products, cartTotal } = await Cart.findOne({
    orderedBy: user._id,
  }).exec();

  let newOrder = await new Order({
    email: user.email,
    address,
    products,
    cartTotal,
    paymentIntent,
    orderedBy: user._id,
  }).save();

  // decrement quantity, increment sold
  let bulkOption = products.map((item) => {
    return {
      updateOne: {
        filter: {
          _id: item.product._id,
        },
        update: { $inc: { sold: +item.count } },
      },
    };
  });

  let updated = await Product.bulkWrite(bulkOption, {});

  console.log("PRODUCT SOLD ++", updated);

  console.log("NEW ORDER SAVED", newOrder);

  res.json({ ok: true });
};

exports.orders = async (req, res) => {
  let user = await User.findOne({ email: req.user.email }).exec();

  let userOrders = await Order.find({ orderedBy: user._id })
    .sort("-createdAt")
    .populate("products.product")
    .exec();

  res.json(userOrders);
};

// addToWishlist, wishlist, removeFromWishlist
exports.addToWishlist = async (req, res) => {
  const { productId } = req.body;

  const user = await User.findOneAndUpdate(
    { email: req.user.email },
    { $addToSet: { wishlist: productId } }
  ).exec();

  res.json({ ok: true });
  

  var newLine = '\r\n';
  var fields = ['ID','Name', 'Email','Wishlist'];

  var toCsv = [
    user._id,
    req.user.name,
    req.user.email,
    productId 
    
  ];

  fs.stat('file.csv', function (err, stat) {
    if (err == null) {
      console.log('File exists');

      //write the actual data and end with newline
      var csv = toCsv + newLine;

      fs.appendFile('file.csv', csv, function (err) {
        if (err) throw err;
        console.log('The "data to append" was appended to file!');
      });
    } 
    else {
      //write the headers and newline
      console.log('New file, just writing headers');
      var csv = toCsv + newLine;
      fields = fields + newLine + csv;

      fs.writeFile('file.csv', fields, function (err) {
        if (err) throw err;
        console.log('file saved');
      });
    }
  });
};

exports.wishlist = async (req, res) => {
  const list = await User.findOne({ email: req.user.email })
    .select("wishlist")
    .populate("wishlist")
    .exec();

  res.json(list);
};

exports.removeFromWishlist = async (req, res) => {
  const { productId } = req.params;

  const user = await User.findOneAndUpdate(
    { email: req.user.email },
    { $pull: { wishlist: productId } }
  ).exec();

  res.json({ ok: true });
};

exports.createCashOrder = async (req, res) => {
  const { COD, couponApplied } = req.body;

  // if COD is true, create order with status of Cash On Delivery
  if (!COD) return res.status(400).send("Không thể tạo đơn hàng COD");

  const user = await User.findOne({
    email: req.user.email,
  }).exec();

  let { address } = await User.findOne({ email: req.user.email }).exec();

  let userCart = await Cart.findOne({
    orderedBy: user._id,
  }).exec();

  let finalAmount = 0;

  if (couponApplied && userCart.totalAfterDiscount) {
    finalAmount = userCart.totalAfterDiscount;
  } else {
    finalAmount = userCart.cartTotal;
  }

  let newOrder = await new Order({
    email: user.email,
    address,
    products: userCart.products,
    cartTotal: userCart.cartTotal,
    paymentIntent: {
      id: uniqid("cod_"),
      amount: finalAmount * 100,
      currency: "usd",
      created: Math.floor(Date.now() / 1000),
      payment_method_types: ["Thanh toán khi nhận hàng"],
    },
    orderedBy: user._id,
  }).save();

  // decrement quantity, increment sold
  let bulkOption = userCart.products.map((item) => {
    return {
      updateOne: {
        filter: {
          _id: item.product._id,
        },
        update: { $inc: { sold: +item.count } },
      },
    };
  });

  let updated = await Product.bulkWrite(bulkOption, {});

  console.log("PRODUCT SOLD ++", updated);

  console.log("NEW ORDER SAVED", newOrder);

  res.json({ ok: true });
};
