# Simple Tracker Service for TK102b style GPS Trackers

This is a simple service backend and HTML query frontend for TK102b style GPS trackers like [this](http://www.gearbest.com/car-gps-tracker/pp_320284.html).

# Installing

Unpack the distribution on your server. Then install the dependencies:

```
npm install
cd static && bower install
```

You will need node, npm and bower already installed. Use Google on how to install these.

# Launching the service

Set the configuration parameters in config.json (an example is provided. Then launch the server with

```
node server.js
```

Make sure the `httpPort` and `trackerPort` are accessible from outside your machine. Then configure 
the GPS tracker to use the service. Send the following SMS messages to the tracker (wait for a confirmation 
SMS after each command), replacing `<your password>` with your tracker's password ("123456" on new devices):
 
```
begin<your password>
```

This initializes the tracker.

```
timezone<your password> 2
```

Replace `2` with `1` for winter time.

```
admin<your password> <your phone number>
```

Make **absolutely sure** you use the correct phone number like it is transmitted by your phone carrier. Test this by
calling yourself and note the displayed number. The value sometimes starts with the country code (for example `+49`), 
sometimes just the number is transmitted.

```
adminip<your password> <your server ip address> <your server trackerPort>
```

This configures the IP address and port of your tracking server.

```
gprs<your password>
```

This switches from SMS reporting to GPRS reporting to the IP set above.

```
t001m***n<your password>
```

This sets the frequency of tracker messages to 1 minute. Change the expression to any interval you like. Refer to the tracker
documentation on the format. It is similar to the crontab format.

The last command starts the tracking. If the tracker's battery goes dead or the server crashes or is unavailable, the
tracker might give up on sending tracking info. In this case, send the interval message again to restart the tracking.

