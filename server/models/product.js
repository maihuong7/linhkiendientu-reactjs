const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
      maxlength: 32,
      text: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
      text: true,
    },
    price: {
      type: Number,
      required: true,
      trim: true,
      maxlength: 32,
    },
    category: {
      type: ObjectId,
      ref: "Category",
    },
    subs: [{ type: ObjectId, ref: "Sub" }],
    sold: { type: Number, default: 0 },
    images: {
      type: Array,
    },
    shipping: {
      type: String,
      enum: ["Có", "Không"],
    },
    //comment
    comment: {
      type: String,
      maxlength: 2000,
    },
    // topping: {
    //   type: String,
    //   enum: [
    //     "Trân châu đen",
    //     "Trân châu ngọc trai",
    //     "Thạch nha đam",
    //     "Thạch trái cây",
    //     "Kem cheese",
    //     "Full topping",
    //   ],
    // },
    brand: {
      type: String,
      enum: ["D'Hoon", "8yo", "Zune", "Casio", "Patek Philippe"],
    },
    atributive: {
      type: String,
      enum: ["Hàng Việt Nam", "Hàng nội địa Trung"],
    },
    ratings: [
      {
        star: Number,
        postedBy: {type: ObjectId, ref: "User"}
      }
    ],
    comments: [
      {
        comment: String,
        postedBy: String,
        postedAt: Date
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
