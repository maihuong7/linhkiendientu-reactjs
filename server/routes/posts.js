const express = require("express");

const router = express.Router();

const {
    commentPost
} = require("../controllers/posts");

const { authCheck, adminCheck } = require("../middlewares/auth");

router.post('comment/:id', authCheck, commentPost)

module.exports = router;