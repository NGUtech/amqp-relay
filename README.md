# AMQP notification relay plugin for c-lightning
This plugin may be useful for your consumer application to process notification from an array
of lightning nodes or ensuring that no notifcations are missed in case of an application failure.

This has been tested with RabbitMQ.

## Dependencies
 - `clightningjs`[https://github.com/darosior/clightningjs]
 - `amqplib`[https://github.com/squaremo/amqp.node]
 - `zermomq`[https://github.com/zeromq/zeromq.js/]

## Installation
 - Clone plugin to your c-lightning plugin directory.
 - Ensure `amqp-relay.js` is executable.
 - Run `npm install` to install required dependencies.

## Configuration
This plugin connects to an AMQP exchange specified with startup options as follows:

 - `amqp-host`: the host address in address:port format
 - `amqp-auth`: the optional service credentials in user:pass format
 - `amqp-exchange`: the name of the exchange you wish to send through
 - `amqp-notifications`: a comma seperated list of notification to relay

It will attempt reconnection every 10 seconds on startup if a host, exchange & notification list are provided.

There are no exposed RPC methods and no c-lightning hooks are used.