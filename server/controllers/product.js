const Product = require("../models/product");
const User = require("../models/user");
const slugify = require("slugify");
const { aggregate } = require("../models/product");

var fs = require('fs');
const { ObjectId } = require("mongodb");

exports.create = async (req, res) => {
  var newLine = '\r\n';
  var fields = ['ID', 'Images', 'Brand','Name product', 'Slug','Price','Description', 'Category', 'Atributive'];

  var toCsv = [
    req.body.id,
    req.body.images,
    req.body.brand,
    req.body.title,
    req.body.title,
    req.body.price,
    req.body.description,
    req.body.category,
    req.body.atributive,
  ];

  fs.stat('product.csv', function (err, stat) {
    if (err == null) {
      console.log('File exists');

      //write the actual data and end with newline
      var csv = toCsv + newLine;

      fs.appendFile('product.csv', csv, function (err) {
        if (err) throw err;
        console.log('The "data to append" was appended to file!');
      });
    } 
    else {
      //write the headers and newline
      console.log('New file, just writing headers');
      var csv = toCsv + newLine;
      fields = fields + newLine + csv;

      fs.writeFile('product.csv', fields, function (err) {
        if (err) throw err;
        console.log('file saved');
      });
    }
  });
  try {
    console.log(req.body);
    req.body.slug = slugify(req.body.title);
    const newProduct = await new Product(req.body).save();
    res.json(newProduct);
    console.log(Product.id)
  } catch (err) {
    console.log(err);
    // res.status(400).send("Create product failed");
    res.status(400).json({
      err: err.message,
    });
  }
};

exports.listAll = async (req, res) => {
  let products = await Product.find({})
    .limit(parseInt(req.params.count))
    .populate("category")
    .populate("subs")
    .sort([["createdAt", "desc"]])
    .exec();
  res.json(products);
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Product.findOneAndRemove({
      slug: req.params.slug,
    }).exec();
    res.json(deleted);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Product delete failed");
  }
};

exports.read = async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
    .populate("category")
    .populate("subs")
    .exec();
  res.json(product);
};

exports.update = async (req, res) => {
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    const updarted = await Product.findOneAndUpdate(
      { slug: req.params.slug },
      req.body,
      { new: true }
    ).exec();

    res.json(updated);
  } catch (err) {
    console.log("PRODUCT UPDATE ERROR ------>", err);
    // return res.status(400).send("Product update failed");
    res.status(400).json({
      err: err.message,
    });
  }
};

// WITHOUT PAGINATION
// exports.list = async (req, res) => {
//   try {
//     // createAt/updatedAt, desc/asc
//     const { sort, order, limit } = req.body;
//     const products = await Product.find({})
//       .populate("category")
//       .populate("subs")
//       .sort([[sort, order]])
//       .limit(limit)
//       .exec();

//     res.json(products);
//   } catch (err) {
//     console.log(err);
//   }
// };

// WITH PAGINATION
exports.list = async (req, res) => {
  // console.table(req.body);
  try {
    // createAt/updatedAt, desc/asc
    const { sort, order, page } = req.body;
    const currentPage = page || 1;
    const perPage = 4;

    const products = await Product.find({})
      .skip((currentPage - 1) * perPage)
      .populate("category")
      .populate("subs")
      .sort([[sort, order]])
      .limit(perPage)
      .exec();

    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

exports.productsCount = async (req, res) => {
  let total = await Product.find({}).estimatedDocumentCount().exec();
  res.json(total);
};

exports.productStar = async (req, res) => {
  const product = await Product.findById(req.params.productId).exec();
  const user = await User.findOne({ email: req.user.email }).exec();
  const { star } = req.body;

  // who is updating
  // check if currently logged in use have already added rating to this product
  let existingRatingObject = product.ratings.find(
    (ele) => ele.postedBy.toString() === user._id.toString()
  );

  // if user haven't ;eft rating yet, push it
  if (existingRatingObject === undefined) {
    let ratingAdded = await Product.findByIdAndUpdate(
      product._id,
      {
        $push: { ratings: { star, postedBy: user._id } },
      },
      { new: true }
    ).exec();
    console.log("ratingAdded", ratingAdded);
    res.json(ratingAdded);
  } else {
    // if user have already left rating, update it
    const ratingUpdated = await Product.updateOne(
      {
        ratings: { $elemMatch: existingRatingObject },
      },
      { $set: { "ratings.$.star": star } },
      { new: true }
    ).exec();
    console.log("ratingUpdated", ratingUpdated);
    res.json(ratingUpdated);
  }
};

exports.listRelated = async (req, res) => {
  const product = await Product.findById(req.params.productId).exec();

  const related = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
  })
    .limit(4)
    .populate("category")
    .populate("subs")
    .populate("postedBy")
    .exec();

  res.json(related);
};

// search/filter

const handleQuery = async (req, res, query) => {
  const products = await Product.find({ $text: { $search: query } })
    .populate("category", "_id name")
    .populate("subs", "_id name")
    .populate("postedBy", "_id name")
    .exec();

  res.json(products);
};

const handlePrice = async (req, res, price) => {
  try {
    let products = await Product.find({
      price: {
        $gte: price[0],
        $lte: price[1],
      },
    })
      .populate("category", "_id name")
      .populate("subs", "_id name")
      .populate("postedBy", "_id name")
      .exec();

    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

const handleCategory = async (req, res, category) => {
  try {
    let products = await Product.find({ category })
      .populate("category", "_id name")
      .populate("subs", "_id name")
      .populate("postedBy", "_id name")
      .exec();

    res.json(products);
  } catch (err) {
    console.log(err);
  }
};

const handleStar = (req, res, stars) => {
  Product.aggregate([
    {
      $project: {
        document: "$$ROOT",
        // title: "$title",
        floorAverage: {
          $floor: { $avg: "$ratings.star" },
        },
      },
    },
    { $match: { floorAverage: stars } },
  ])
    .limit(12)
    .exec((err, aggregates) => {
      if (err) console.log("AGGREGATE ERROR", err);
      Product.find({ _id: aggregates })
        .populate("category", "_id name")
        .populate("subs", "_id name")
        .populate("postedBy", "_id name")
        .exec((err, products) => {
          if (err) console.log("PRODUCT AGGREGATE ERROR", err);
          res.json(products);
        });
    });
};

const handleSub = async (req, res, sub) => {
  const products = await Product.find({ subs: sub })
    .populate("category", "_id name")
    .populate("subs", "_id name")
    .populate("postedBy", "_id name")
    .exec();

  res.json(products);
};


const handleShipping = async (req, res, shipping) => {
  const products = await Product.find({ shipping })
    .populate("category", "_id name")
    .populate("subs", "_id name")
    .populate("postedBy", "_id name")
    .exec();

  res.json(products);
};

// const handleTopping = async (req, res, topping) => {
//   const products = await Product.find({ topping })
//     .populate("category", "_id name")
//     .populate("subs", "_id name")
//     .populate("postedBy", "_id name")
//     .exec();

//   res.json(products);
// };

const handleBrand = async (req, res, brand) => {
  const products = await Product.find({ brand })
    .populate("category", "_id name")
    .populate("subs", "_id name")
    .populate("postedBy", "_id name")
    .exec();

  res.json(products);
};
const handleAtr = async (req, res, atributive) => {
  const products = await Product.find({ atributive })
    .populate("category", "_id name")
    .populate("subs", "_id name")
    .populate("postedBy", "_id name")
    .exec();

  res.json(products);
};

exports.searchFilters = async (req, res) => {
  const {
    query,
    price,
    category,
    stars,
    sub,
    shipping,
    // topping,
    brand,
    atributive,
  } = req.body;

  if (query) {
    console.log("query", query);
    await handleQuery(req, res, query);
  }

  // price [20, 200]
  if (price !== undefined) {
    console.log("price", price);
    await handlePrice(req, res, price);
  }

  if (category) {
    console.log("category", category);
    await handleCategory(req, res, category);
  }

  if (stars) {
    console.log("category", stars);
    await handleStar(req, res, stars);
  }

  if (sub) {
    console.log("sub", sub);
    await handleSub(req, res, sub);
  }

  if (shipping) {
    console.log("shipping", shipping);
    await handleShipping(req, res, shipping);
  }

  // if (topping) {
  //   console.log("topping", topping);
  //   await handleTopping(req, res, topping);
  // }

  if (brand) {
    console.log("brand", brand);
    await handleBrand(req, res, brand);
  }
  if (atributive) {
    console.log("atributive", atributive);
    await handleAtr(req, res, atributive);
  }
};

exports.comment = async (req, res) => {
  const user = await User.findOne({ email: req.user.email }).exec();
  const { comment } = req.body
  try {
    const id = req.params.productId
    const commentProduct = await Product.findByIdAndUpdate(
      id,
      {
        $push: { comments: { comment, postedBy: user.name, postedAt: Date.now() } },
      },
      { new: true }
    ).exec();
    console.log("comment", commentProduct);
    res.json(commentProduct)
  } catch (err) {
    console.log(err);
    res.status(400).json({
      err: err.message,
    });
  }
};
