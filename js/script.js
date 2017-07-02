var app = new Object;

$(document).ready(function(){

  app = {
    center: {
      lat: -41.16149186921309,
      lng: 171.93083095625002
    },
    zoom: {
      default: 6
    },
    template: function(template, success_function){
      if(success_function){
        $.ajax({
          url: ("tmpl/" + template + ".html"),
          success: success_function
        });
      }
      else return $("script[data-template=\"" + template + "\"]").html();
    },
    include: function(link, type, return_function){
      if(type=="js") $.getScript(link, return_function);
      if(type=="css"){
        $el = $("<link />");
        $el
          .attr("rel", "stylesheet")
          .attr("href", link)
          .ready(return_function)
        ;
        $("body").append($el);
      }
    },
    aAdd: function(){
      app.assetsCount++;
    },
    init: function(){
      app.aAdd();
      app.include(("https://maps.googleapis.com/maps/api/js?libraries=geometry&key=" + (window.location.hostname == "localhost" ? "AIzaSyDUhuRDR9mGCjRK19_AJ0TYz1kK4lAOR9o" : "AIzaSyCUlkyfiisV-1JwYVEITouh3qXed8ejS18")), "js", app.load);

      app.aAdd();
      app.include("https://cdnjs.cloudflare.com/ajax/libs/template7/1.2.3/template7.min.js", "js", app.load);

      app.aAdd();
      app.template("main", function(data){
        $("#wrapper").html(data);
        app.load();
      });
    },
    assetsCount: 0,
    load: function(){
      app.assetsCount -= 1;
      if(app.assetsCount > 0) return;

      $("#loading-wrap").fadeOut(500);

      app.map = new google.maps.Map(document.getElementById("map"), {
        center: app.center,
        zoom: app.zoom.default,
        clickableIcons: false,
        disableDefaultUI: true,
        disableDoubleClickZoom: true,
        draggable: false,
        scrollwheel: false
      });
    }
  };
  app.init();
});
