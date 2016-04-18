
var map = null;
var currentMode = "latest";
var rangeMarkers = [];
var rangePath = null;
var latestTrackerId = null;
var latestMarker = null;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 17
    });
    showLatest();
    $("#plot").click(function() {
        showRange($("#rangeTracker").val(), new Date($("#dtpStart").val()).getTime(), new Date($("#dtpEnd").val()).getTime());
    });
    $("#show").click(function() {
        showLatest($("#showTracker").val());
    });
    setInterval(function() {
        if (currentMode=="latest")
            showLatest();
    }, 3000);
}

function str2decLat(degree, point, flag) {
    var result = degree + (point/60);
    if (flag=="S")
        result *= -1;
    return result;
}

function showRange(trackerId, startEpoch, endEpoch) {
    console.log("Showing range path..");
    currentMode = "range";
    clearMap();
    latestTrackerId = null;
    $.get("/api/range/" + trackerId + "/" + startEpoch + "/" + endEpoch, function( data ) {
        if (!data || data.length<1)
            alert("Tracker has no data for selected range!");
        else {
            var course = [];
            for (var i=0; i<data.length; i++) {
                var lat = str2decLat(data[i].latitudeDegree, data[i].latitudePoint, data[i].latitudeFlag);
                var lon = str2decLat(data[i].longitudeDegree, data[i].longitudePoint, data[i].longitudeFlag);
                course.push({ lat: lat, lng: lon, trackerDate: data[i].trackerDate, trackerId: data[i].trackerId });
            }
            map.setCenter(course[0]);
            rangePath = new google.maps.Polyline({
                path: course,
                geodesic: true,
                strokeColor: '#FF0000',
                strokeOpacity: 1.0,
                strokeWeight: 2
            });
            rangePath.setMap(map);
            for (var j=0; j<course.length; j++) {
                rangeMarkers.push(new google.maps.Marker({
                    position: course[j],
                    map: map,
                    title: new Date(course[j].trackerDate).toLocaleString() + " -- " + course[j].trackerId
                }));
            }
        }
    });
}

function clearMap() {
    if (rangePath) {
        rangePath.setMap(null);
        rangePath = null;
    }
    if (rangeMarkers.length>0) {
        for (var i=0; i<rangeMarkers.length; i++) {
            rangeMarkers[i].setMap(null);
        }
        rangeMarkers = [];
    }
    if (latestMarker!=null) {
        latestMarker.setMap(null);
        latestMarker = null;
    }
}

function showLatest(trackerId) {
    if (currentMode!="latest") {
        currentMode = "latest";
        clearMap();
    }
    var trackerIdParam = "";
    if (trackerId) {
        latestTrackerId = trackerId;
        trackerIdParam = "/" + trackerId;
    } else if (latestTrackerId!=null)
        trackerIdParam = "/" + latestTrackerId;
    $.get("/api/latest" + trackerIdParam, function( data ) {
        var lat = str2decLat(data.latitudeDegree, data.latitudePoint, data.latitudeFlag);
        var lon = str2decLat(data.longitudeDegree, data.longitudePoint, data.longitudeFlag);
        if (!latestMarker || geoRound(latestMarker.getPosition().lat())!=geoRound(lat) || geoRound(latestMarker.getPosition().lng())!=geoRound(lon)) {
            console.log("Position of latest marker changed, updating map..");
            var myLatLng = {lat: lat, lng: lon};
            map.setCenter(myLatLng);
            var contentString = '<div id="content">'+
                '<div id="siteNotice">'+
                '</div>'+
                '<div id="bodyContent">'+
                '<p>' +
                '<b>Seen:</b> ' + new Date(data.trackerDate).toLocaleString() + '<br>' +
                '<b>Database Timestamp:</b> ' + new Date(data.timestamp).toLocaleString() + '<br>' +
                '<b>Tracker Id:</b> ' + data.trackerId + '<br>' +
                '</p>'+
                '</div>'+
                '</div>';
            var infowindow = new google.maps.InfoWindow({
                content: contentString
            });
            if (latestMarker!=null)
                latestMarker.setMap(null);
            latestMarker = new google.maps.Marker({
                position: myLatLng,
                map: map,
                title: new Date(data.trackerDate).toLocaleString()
            });
            latestMarker.addListener('click', function() {
                infowindow.open(map, latestMarker);
            });
            setTimeout(function() {
                infowindow.open(map, latestMarker);
            }, 1000);
        }
    });
}

function geoRound(inValue) {
    return Math.round(inValue * 10000000) / 10000000
}

jQuery(function() {
    jQuery('#dtpStart').datetimepicker({
        onShow: function (ct) {
            this.setOptions({
                maxDate: jQuery('#dtpEnd').val() ? jQuery('#dtpEnd').val() : false
            })
        },
        timepicker: true
    });
    jQuery('#dtpEnd').datetimepicker({
        onShow: function (ct) {
            this.setOptions({
                minDate: jQuery('#dtpStart').val() ? jQuery('#dtpStart').val() : false
            })
        },
        timepicker: true
    });

    $.get("/api/trackerlist", function(data) {
        for (var i=0; i<data.length; i++)
            $(".trackerId").append("<option " + (i==0?"selected":"") + " value='" + data[i] + "'>" + data[i] + "</option>")
    });

});
