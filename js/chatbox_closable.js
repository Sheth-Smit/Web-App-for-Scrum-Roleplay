$(document).ready(function () {
    $('#sidebarCollapse').on('click', function () {
        $('#sidebar').toggleClass('active');
    });
    // $('#chat_icon').removeClass('open');
    $('#menu').css("right","-300px");
    $('#chat_icon').on('click',function(){
      // alert("sgxh");
        if($('#chat_icon').hasClass('open')){
            $(this).removeClass('open');
            $(this).animate({
                "right":"20px",
                "background-position":"0px"
            }, 0.3);
            $('#menu').animate({"right":"-300px"}, 0.5);
            // $('#content').css("position","absolute");
            $('#content').animate({
                "width":"98%",
                // "z-index":"999"
            }, 0.5);
        }
        else{
            $(this).addClass('open');
            $(this).animate({
                "right":"310px",
                "background-position":"-40px"
            }, 0.3);
            $('#menu').animate({"right":"0px"}, 0.5);
            // $('#content').css("position","absolute");
            $('#content').animate({
                "width":"64%",
                // "z-index":"999"
            }, 0.5);
        }
    });
});
