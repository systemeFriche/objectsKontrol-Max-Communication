

var express = require("express");
var router = new express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
	res.render("index", {
		title: "Send and receive OSC message to and from a web browser."
	});
});

module.exports = router;
