var scrolled = false;
function updateScroll(){
    if(!scrolled){
        var element = document.getElementById("message-container");
        element.scrollTop = element.scrollHeight;
    }
}

$("#message-container").on('scroll', function(){
    scrolled=true;
});

setInterval(updateScroll,5);