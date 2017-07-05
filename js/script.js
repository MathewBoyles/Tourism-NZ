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
    vars: {
      lang: "en",
      languages: [],
      locations: [],
      vehicles: [],
      rentals: [],
      distance: {
        text: "",
        value: 0
      },
      duration: {
        days: 0,
        value: 0
      },
      party: 0,
      days: 1,
      vehicle: null
    },
    tmp: [],
    assetsCount: 0,
    loaded: false,
    init: function(){
      app.aAdd().include(("https://maps.googleapis.com/maps/api/js?libraries=geometry,places&key=" + (window.location.hostname == "localhost" ? "AIzaSyDUhuRDR9mGCjRK19_AJ0TYz1kK4lAOR9o" : "AIzaSyCUlkyfiisV-1JwYVEITouh3qXed8ejS18")), "js", function(){
        app.contentAware().load();
      });

      app.aAdd().include("https://cdnjs.cloudflare.com/ajax/libs/Swiper/3.4.2/css/swiper.min.css", "css", app.load);

      app.aAdd(2).include("https://cdnjs.cloudflare.com/ajax/libs/template7/1.2.3/template7.min.js", "js", function(){
        app.aAdd().include("https://cdnjs.cloudflare.com/ajax/libs/Swiper/3.4.2/js/swiper.jquery.js", "js", function(){
          app.aAdd().include("js/poi.json", "json", function(data){
            app.setVar("poi", data);

            app.aAdd(2).include("js/languages.json", "json", function(data){
              app.setVar("languages", data);

              app.template("language", function(data){
                $("#loadingWrap").fadeOut(500);

                $("#languages").html(data);
                app.contentAware().load();
              });
              app.load();
            });
            app.load();
          });
          app.load();
        });
        app.load();
      });

      app.aAdd().include("js/fuel.json", "json", function(data){
        $.each(data, function(name, value){
          app.setVar(name, value);
        });
        app.load();
      });

      app.aAdd().include("js/vehicles.json", "json", function(data){
        app.setVar("vehicles", data);
        app.load();
      });

      app.aAdd().include("js/agents.json", "json", function(data){
        app.setVar("agents", data);
        app.load();
      });

      return app;
    },
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
      app.distanceService = new google.maps.DistanceMatrixService();
      app.directionsService = new google.maps.DirectionsService();
      app.directionsDisplay = new google.maps.DirectionsRenderer();
      app.directionsDisplay.setMap(null);

      app.loaded = true;
      app.contentAware();

      return app;
    },
    include: function(link, type, returnFunction){
      link += (/\?/.test(link) ? "&" : "?") + "_=" + Date.now();

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
          var tmplData_tmp;

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
          delete tmplData_tmp;

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
    contentAware: function(){
      if(typeof Template7 == "undefined" || typeof google == "undefined") return app;

      $("tmpl").each(function(){
        if($(this).data("dataInit")) return;
        $(this).data("dataInit", true);

        app.template($(this).attr("src"), function(data){
          var dataWait = $(this).attr("data-wait") == "true";

          $(this).after(data).remove();

          if(dataWait) app.load("wait");
          app.contentAware();
        }, $(this));
      });

      $("[data-action]").each(function(){
        $(this)
          .data("dataAction", $(this).attr("data-action"))
          .removeAttr("data-action")
          .click(function(e){
            var clickData = $(this).data("dataAction").split(":");

            app[clickData[0]].apply($(this), clickData[1] ? clickData[1].split(",") : []);

            e.preventDefault();
          });
      });

      $("#steps_start .stepSwiper").each(function(){
        var swiper = new Swiper(this, {
          paginationClickable: false,
          preloadImages: false,
          lazyLoading: true,
          spaceBetween: 20,
          autoplay: 5000,
          autoplayDisableOnInteraction: true
        });
        $(this).data("swiper", swiper);
      });

      function checkAllSteps(type){
        var hasError = false;
        var startOkay = false;
        var endOkay = false;

        app.setVar("distance", {text:"",value:0});
        app.setVar("duration", {days:0,value:0});
        app.setVar("locations", []);

        $("#steps_route .stepLocation").each(function(){
          if($(this).find(".form-control").data("searchBox").getPlace() && $(this).find(".form-control").val()){
            if($(this).attr("data-stop") == "start") startOkay = true;
            if($(this).attr("data-stop") == "end") endOkay = true;
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
            if($(this).parent().parent().attr("data-stop") || $(this).val()) thisError = true;

            if(thisError){
              $(this).parent().addClass("has-error");
              hasError = true;
            }
            if(thisError || !$(this).val()) $(this).data("marker").setMap(null);
          }
        });

        $("#steps_route_error").addClass("hide");
        $("#steps_route_next").attr("disabled", "disabled");

        if(hasError){
          app.directionsDisplay.setMap(null);
          $("#steps_route .stepLocation .form-control").each(function(){
            $(this).data("marker").setMap($(this).val() ? app.map : null);
          });
        }
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

          app.vars.locations.push(request.origin);

          $("#steps_route .stepLocation:not([data-stop])").each(function(){
            if($(this).hasClass("has-error") || !$(this).find(".form-control").val()) return;

            var stepArray = {
              location: $(this).find(".form-control").data("searchBox").getPlace().geometry.location,
              stopover: true
            };

            request.waypoints.push(stepArray);
            app.vars.locations.push(stepArray.location);
          });

          app.vars.locations.push(request.destination);

          app.directionsService.route(request, function(result, status) {
            if(status == "OK"){
              var stepDistance = 0;
              var stepDuration = 0;
              $.each(result.routes[0].legs, function(i, leg){
                stepDistance += leg.distance.value;
                stepDuration += leg.duration.value;
              });

              app.vars.distance.text = Math.ceil(stepDistance / 1000) + "km";
              app.vars.distance.value = stepDistance;
              app.vars.duration.days = Math.max(2, Math.ceil(((stepDuration + ((app.vars.locations.length - 2) * (2 * 60 * 60))) / ( 60 * 60 * 14 )))) + 1;
              app.vars.duration.value = stepDuration;

              if(app.vars.distance.value < 50000){
                app.template("#steps/route/error/short", function(data){
                  $("#steps_route_error").removeClass("hide").find("span").html(data);
                });

                return;
              }

              if(app.vars.duration.days > app.vars.days) app.manageDays("set", app.vars.duration.days);

              app.template("#steps/days/info", function(data){
                $("#steps_route_info").html(data);
              }, null, {});

              $("#steps_route_next").removeAttr("disabled");

              app.directionsDisplay.setDirections(result);

              $("#steps_route .stepLocation .form-control").each(function(){
                $(this).data("marker").setMap(null);
              });
            }
            else{
              app.template("#steps/route/error/none", function(data){
                $("#steps_route_error").removeClass("hide").find("span").html(data);
              });
            }
          });
        }
      }
      $("#steps_route .stepLocation .form-control").each(function(){
        if($(this).data("dataInit")) return;
        $(this).data("dataInit", true);

        $(this).on("focus", function(){
          $(this).val("");
          $(this).data("marker").setMap(null);
          checkAllSteps("focus");
        });

        var marker = new google.maps.Marker();
        var searchBox = new google.maps.places.Autocomplete(this, {
          componentRestrictions: {country: "nz"}
        });

        $(this).data("marker", marker);
        $(this).data("searchBox", searchBox);

        $(this).data("searchBox").addListener('place_changed', function() {
          if(!searchBox.getPlace()) return;

          $(this).parent().removeClass("has-error");
          checkAllSteps("change");
        });
      });

      $("#steps_party .stepParty .stepParty-item").each(function(){
        if($(this).data("dataInit")) return;
        $(this).data("dataInit", true);

        $(this).click(function(){
          app.vars.party = Number($(this).find("img").attr("data-party"));
          $("#steps_party_next").removeAttr("disabled");
          $("#steps_party .stepParty .stepParty-item").removeClass("active");
          $(this).addClass("active");
        });
      });

      return app;
    },
    setLang: function(lang){
      $("html").attr("lang", lang);
      app.setVar("lang", lang);

      $("#loadingWrap small,#loadingWrap span[lang]").hide();
      $("#loadingWrap [lang=\"" + lang + "\"]").show();

      $("#loadingWrap").fadeIn(500, function(){
        $("#languageWrap").hide();
        app.template("main", function(data){
          $("#wrapper").html(data);
          app.contentAware().load();
        });
      });

      return app;
    },
    setStep: function(step){
      if($(this).attr("disabled")) return app;

      $("#content.steps .step.active").removeClass("active").slideUp(300);
      $("#content.steps .step[data-step=\"" + step + "\"]").addClass("active").slideDown(300);

      if(step == "vehicles"){
        app.setVar("rentals", []);

        $.each(app.vars.vehicles, function(i, vehicle){
          if(app.vars.party < vehicle.party.min || app.vars.party > vehicle.party.max) return;
          if(app.vars.days < vehicle.days.min || app.vars.days > vehicle.days.max) return;

          var pushVehicle = vehicle;
          pushVehicle.id = i;
          pushVehicle.fuel_cost = (((vehicle.fuel / 100) * app.vars.fuel ) * (app.vars.distance.value / 1000)).toFixed(2);
          app.vars.rentals.push(pushVehicle);
        });

        app.template("#steps/vehicles/vehicle", function(data){
          $("#steps_vehicles_list").html(data);
        });
      }

      app.contentAware();

      return app;
    },
    manageStops: function(method, id){
      var stopsNum = $("#steps_route .stepLocation:not([data-stop])").length;

      if(method == "add"){
        stopsNum++;

        app.template("#steps/route/destination", function(data){
          $("#steps_route .stepLocation:not([data-stop]):last").after(data);
        }, null, {num: stopsNum});
      }

      if(stopsNum >= 20) $("#steps_route .stepLocation-add").hide();
      else $("#steps_route .stepLocation-add").show();

      return app;
    },
    manageDays: function(method, num){
      var daysCount = Number($("#steps_route_num").html());
      if(method == "add") daysCount++;
      if(method == "remove") daysCount--;
      if(method == "set") daysCount = num;

      if(daysCount < 1 || daysCount > 30) daysCount = daysCount < 1 ? 1 : 30;

      $("#steps_route_num").html(daysCount);
      app.setVar("days", daysCount);

      return app;
    },
    selectVehicle: function(id){
      id = Number(id);
      app.setVar("vehicle", id);

      var vehicleArray = app.vars.vehicles[id];
      vehicleArray.agentInfo = app.vars.agents[vehicleArray.agent];
      vehicleArray.prices = {};
      vehicleArray.prices.days = Number(vehicleArray.price * app.vars.days);
      vehicleArray.prices.fuel = Number((((vehicleArray.fuel / 100) * app.vars.fuel) * (app.vars.distance.value / 1000)).toFixed(2));
      vehicleArray.prices.total = vehicleArray.prices.days + vehicleArray.prices.fuel;

      app.template("#infobox", function(data){
        $(data)
          .modal("show")
          .bind("hidden.bs.modal", function(){
            $(".modal,.modal-backdrop").remove();
          })
          .bind("shown.bs.modal", function(){
            app.contentAware();
          });
      }, null, vehicleArray);

      return app;
    },
    setVar: function(name, value){
      app.vars[name] = value;

      return app;
    },
    aAdd: function(add){
      app.assetsCount += add||1;

      return app;
    },
    reload: function(){
      $(".modal:visible").modal("hide");
      $("#loadingWrap").show();

      app.loaded = false;

      app.template("main", function(data){
        $("#wrapper").html(data);
        app.load();
      });

      return app;
    }
  };

  app.init();
});
