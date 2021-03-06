# AMQP notification relay plugin for c-lightning
This plugin may be useful for your consumer application to process notifications from an array
of lightning nodes or ensuring that no notifcations are missed in case of an application failure.

This has been tested with RabbitMQ.

## Dependencies
 - `clightningjs`[https://github.com/lightningd/clightningjs]
 - `amqplib`[https://github.com/squaremo/amqp.node]

## Installation
 - Clone plugin to your c-lightning plugin directory.
 - Ensure `amqp-relay.js` is executable.
 - Run `npm install` to install required dependencies.

## Configuration
This plugin connects to an AMQP exchange specified with startup options as follows:

 - `amqp-host`: the host address in address:port format
 - `amqp-auth`: the optional service credentials in user:pass format
 - `amqp-exchange`: the name of the exchange you wish to send through
 - `amqp-prefix`: an optional message prefix for routing (default is `lightningd.message.`)
 - `amqp-delay`: an optional relay delay in ms (suitable for `x-delayed-message` type exchanges)
 - `amqp-notifications`: a comma seperated list of notifications to relay. Notification types are [listed here](https://lightning.readthedocs.io/PLUGINS.html#notification-types). Note also that `warning` notifications are not implemented yet.

It will attempt reconnection every 10 seconds on startup if a host, exchange & notification list are provided.

There are no exposed RPC methods and no c-lightning hooks are used.
