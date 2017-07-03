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
    tmp: [],
    vars: {
      lang: "en",
      locations: []
    },
    setVar: function(name, value){
      app.vars[name] = value;
      return app;
    },
    contentAware: function(){
      $("tmpl").each(function(){
        if($(this).data("dataInit")) return;
        $(this).data("dataInit", true);
        app.template($(this).attr("src"), function(data){
          var dataWait = $(this).attr("data-wait") == "true";
          $(this)
            .after(data)
            .remove();
          if(dataWait) app.load("wait");
          app.contentAware();
        }, $(this));
      });
      $("[data-action]").each(function(){
        $(this)
          .data("data-action", $(this).attr("data-action"))
          .removeAttr("data-action")
          .click(function(){
            var clickData = $(this).data("data-action").split(":");
            app[clickData[0]].apply($(this), clickData[1].split(","));
            event.preventDefault();
          });
      });
      $("#steps_route .stepLocation .form-control").each(function(){
        if(typeof google == "undefined") return;
        if($(this).data("dataInit")) return;
        $(this).data("dataInit", true);

        function checkAll(){
          var hasError = false;
          var startOkay = false;
          var endOkay = false;

          $("#steps_route .stepLocation .form-control").each(function(){
            if($(this).data("searchBox").getPlace() && $(this).val()){
              if($(this).parent().parent().attr("data-stop") == "start") startOkay = true;
              if($(this).parent().parent().attr("data-stop") == "end") endOkay = true;
            }
          });

          if(!startOkay || !endOkay) hasError = true;

          $("#steps_route .stepLocation .form-control").each(function(){
            var thisError = false;
            $(this).parent().removeClass("has-error");
            if($(this).data("searchBox").getPlace() && $(this).val()){
              $(this).data("marker").setMap(app.map);
              $(this).data("marker").setPosition($(this).data("searchBox").getPlace().geometry.location);
            }
            else {
              if($(this).parent().parent().attr("data-stop")) thisError = true;
              if($(this).val()) thisError = true;

              if(thisError){
                $(this).parent().addClass("has-error");
                hasError = true;
              }
              if(thisError || !$(this).val()) $(this).data("marker").setMap(null);
            }
          });
          $("#steps_route_error").addClass("hide");
          $("#steps_route_next").attr("disabled", "disabled");
          if(hasError) app.directionsDisplay.setMap(null);
          else {
            app.directionsDisplay.setMap(app.map);
            var request = {
              origin: {},
              destination: {},
              waypoints: [],
              travelMode: "DRIVING"
            };

            request.origin = $("#steps_route .stepLocation[data-stop=\"start\"] .form-control").data("searchBox").getPlace().geometry.location;
            request.destination = $("#steps_route .stepLocation[data-stop=\"end\"] .form-control").data("searchBox").getPlace().geometry.location;

            $("#steps_route .stepLocation:not([data-stop])").each(function(){
              if($(this).hasClass("has-error") || !$(this).find(".form-control").val()) return;
              request.waypoints.push({
                location: $(this).find(".form-control").data("searchBox").getPlace().geometry.location,
                stopover: true
              });
            });

            app.directionsService.route(request, function(result, status) {
              if(status == "OK"){
                $("#steps_route_next").removeAttr("disabled");
                app.directionsDisplay.setDirections(result);
              }
              else $("#steps_route_error").removeClass("hide");
            });
          }
        }

        $(this).on("blur", function(){
          if($(this).data("searchBox").getPlace() && $(this).val()) $(this).parent().removeClass("has-error");
          checkAll();
        });

        var searchBox = new google.maps.places.Autocomplete(this, {
          componentRestrictions: {country: "nz"}
        });
        var marker = new google.maps.Marker();

        $(this).data("searchBox", searchBox);
        $(this).data("marker", marker);

        $(this).data("searchBox").addListener('place_changed', function() {
          var places = searchBox.getPlace();
          if (places.length == 0) {
              return;
          }
          $(this).parent().removeClass("has-error");
          checkAll();
        });
      });
      return app;
    },
    template: function(template, successFunction, element, parse){

      function newSuccess(template, successFunction, element, parse){
        return function(tmplData, status, tmplInfo){
          var tmplParse = new Object;

          try {
            if(element){
              if(element.attr("parse")){
                if(element.attr("parse").substr(0, 1) == "#") tmplParse = $("script[type=\"template/parse\"][data-name=\"" + element.attr("parse").substr(1) + "\"]").html();
                else tmplParse = element.attr("parse");

                tmplParse = JSON.parse(tmplParse);
              }
            }
            else if(parse){
              if(typeof parse == "string") tmplParse = JSON.parse(parse);
              else tmplParse = parse;
            }
          }
          catch(err){
            console.error("app.template", "PARSE FAILED", err);
          }
          tmplParse.global = app.vars;
          var tmplData_tmp = new String;

          tmplData_tmp = $("<script />");
          tmplData_tmp.attr("type", "text/plain");
          tmplData_tmp.html(tmplData);
          tmplData_tmp.find("script").each(function(){
            app.tmp.push($(this).html());
            $(this).html(app.tmp.length-1);
          });

          tmplData = Template7.compile(tmplData_tmp.html());
          tmplData = tmplData(tmplParse);

          tmplData_tmp.remove();
          tmplData_tmp = $("<script />");
          tmplData_tmp.attr("type", "text/plain");
          tmplData_tmp.html(tmplData);
          tmplData_tmp.find("script").each(function(){
            var tmplID = Number($(this).html());
            $(this).html(app.tmp[tmplID]);
            app.tmp[tmplID] = "";
          });
          tmplData = tmplData_tmp.html();
          tmplData_tmp.remove();

          successFunction.call(element, tmplData, status, tmplInfo);
          app.contentAware();
        }
      }

      if(template.substr(0,1) == "#"){
        var tmplData = $("script[type=\"template/template\"][data-name=\"" + template.substr(1) + "\"]").html();
        var tmplFunction = newSuccess(template, successFunction, element, parse);
        tmplFunction(tmplData, "success", "internal");
      }
      else {

        var tmplURL;
        if(template.substr(0,8) == "https://" || template.substr(0,7) == "http://") tmplURL = template;
        else {
          template = template.replace(new RegExp("{{global.lang}}", "g"), app.vars.lang);
          tmplURL = "tmpl/" + template + ".html";
        }

        $.ajax({
          url: tmplURL,
          success: newSuccess(template, successFunction, element, parse),
          cache: false
        });
      }

      return app;
    },
    include: function(link, type, returnFunction){
      if(type=="css"){
        $el = $("<link />");
        $el
          .attr("rel", "stylesheet")
          .attr("href", link)
          .ready(returnFunction);
        $("body").append($el);
      }
      if(type=="js") $.getScript(link, returnFunction);
      if(type=="json") $.getJSON(link, returnFunction);

      return app;
    },
    aAdd: function(add){
      app.assetsCount += add||1;
      return app;
    },
    init: function(){
      app.aAdd().include(("https://maps.googleapis.com/maps/api/js?libraries=geometry,places&key=" + (window.location.hostname == "localhost" ? "AIzaSyDUhuRDR9mGCjRK19_AJ0TYz1kK4lAOR9o" : "AIzaSyCUlkyfiisV-1JwYVEITouh3qXed8ejS18")), "js", app.load);

      app.aAdd(2).include("https://cdnjs.cloudflare.com/ajax/libs/template7/1.2.3/template7.min.js", "js", function(){
        app.load();
        app.template("{{global.lang}}/main", function(data){
          $("#wrapper").html(data);
          app.contentAware().load();
        });
      });

      return app;
    },
    assetsCount: 0,
    loaded: false,
    load: function(type){
      if(app.loaded) return app;
      if(type != "wait") app.aAdd(-1);
      if(app.assetsCount > 0 || $("tmpl[data-wait=\"true\"]").is("*")) return app;

      $("#loadingWrap").fadeOut(500);

      $("#content.steps .step:not(.active)").hide();

      app.map = new google.maps.Map(document.getElementById("map"), {
        center: app.center,
        zoom: app.zoom.default,
        clickableIcons: false,
        disableDefaultUI: true,
        disableDoubleClickZoom: true,
        draggable: false,
        scrollwheel: false
      });
      app.directionsService = new google.maps.DirectionsService();
      app.directionsDisplay = new google.maps.DirectionsRenderer();
      app.directionsDisplay.setMap(null);

      app.loaded = true;
      app.contentAware();

      return app;
    },
    setStep: function(step){
      if($(this).attr("disabled")) return app;
      $("#content.steps .step.active").removeClass("active").slideUp("fast");
      $("#content.steps .step[data-step=\"" + step + "\"]").addClass("active").slideDown("fast");
      return app;
    },
    manageStops: function(method, id){
      if(method == "add"){
        var stopsNum = $("#steps_route .stepLocation:not([data-stop])").length + 1;
        app.template("#steps/route/destination", function(data){
          $("#steps_route .stepLocation:not([data-stop]):last").after(data);
        }, null, {num: stopsNum});

        if(stopsNum >= 20) $("#steps_route .stepLocation-add").hide();
      }
      return app;
    }
  };

  app.init();
});
