// LOADING
var loading_translation = ["Loading","装载","積載","Laden","로딩"];
var loading_i = 0;
setInterval(function(){
  loading_i++;
  if(loading_i == loading_translation.length) loading_i = 0;
  document.getElementById("loading-text").innerText = loading_translation[loading_i];
}, 1000);
// /LOADING

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
    template: function(template){
      return Template7.compile(
        $("script[type=\"template/template-7\"][data-template=\""+template+"\"]").html()
      );
    },
    include: function(link, type, return_function){
      if(type=='js') $.getScript(link, return_function);
      if(type=='css'){
        $el = $("<link />");
        $el
          .attr("rel", "stylesheet")
          .attr("href", link)
          .ready(return_function)
        ;
        $("body").append($el);
      }
    },
    init: function(){
      app.assets_count++;
      app.include(("https://maps.googleapis.com/maps/api/js?libraries=geometry&key=" + (window.location.hostname == "localhost" ? "AIzaSyDUhuRDR9mGCjRK19_AJ0TYz1kK4lAOR9o" : "AIzaSyCUlkyfiisV-1JwYVEITouh3qXed8ejS18")), "js", app.load);

      app.assets_count++;
      app.include("https://cdnjs.cloudflare.com/ajax/libs/template7/1.2.3/template7.min.js", "js", function(){
        $("#wrapper").append(app.template('mainWrapper'));
        app.load();
      });
    },
    assets_count: 0,
    load: function(){
      app.assets_count -= 1;
      if(app.assets_count > 0) return;

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
