$("document").ready(function () {
	var domElement = $(".tweetSlot").get(0);
    $(domElement).one(hide());
    $(domElement).one(slideDown(2000));
});