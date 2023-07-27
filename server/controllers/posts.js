const User = require("../models/user");
const mongoose = require("mongoose");


exports.commentPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { value } = req.body;

        const post = await User.findByid(id);

        post.comments.push(value);

        const updatePost = await User.findByidAndUpdate(id, post, { new: true });
        res.json(updatePost);
    } catch (err) {
        console.log(err);
        res.status(400).json({
            err: err.message,
        });
    }
};
