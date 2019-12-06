#!/usr/bin/env node
const amqplib = require('amqplib/callback_api');
const Plugin = require('clightningjs');

const relayPlugin = new Plugin();
let amqp, auth, host, exchange, connectionInterval;
let enabledNotifications = {};

relayPlugin.onInit = function(params) {
  if (params.options['amqp-host'] !== 'off') {
    host = params.options['amqp-host'];
  }

  if (params.options['amqp-auth'] !== 'off') {
    auth = params.options['amqp-auth'];
  }

  if (params.options['amqp-exchange'] !== 'off') {
    exchange = params.options['amqp-exchange'];
  }

  if (params.options['amqp-notifications'] !== 'off') {
    params.options['amqp-notifications'].split(',').forEach(
      event => {
        enabledNotifications[event] = true;
      }
    );
  }

  if (host && exchange && Object.keys(enabledNotifications).length > 0) {
    connectQueue();
    connectionInterval = setInterval(connectQueue, 10000);
  } else {
    relayPlugin.log('Plugin is installed but not enabled');
  }

  return true;
};

function connectQueue() {
  relayPlugin.log('Connecting to AMQP service at ' + host);
  const endpoint = auth ? auth+'@'+host : host;
  amqplib.connect('amqp://'+endpoint, function(err, conn) {
    if (err != null) {
      relayPlugin.log('AMQP connection error: '+err.code);
      return;
    }
    conn.createChannel(function(err, ch) {
      if (err != null) {
        relayPlugin.log('AMQP channel error: '+err.code);
        return;
      }
      amqp = ch;
      clearInterval(connectionInterval);
      ch.assertExchange(exchange, 'topic', {durable: true, autoDelete: false});
      relayPlugin.log('AMQP channel connection established.');
    })
  });
}

function publish(event, message) {
  if (amqp && enabledNotifications[event] === true) {
    amqp.publish(exchange, 'clightning.'+event, Buffer.from(JSON.stringify(message)));
  }
}

relayPlugin.addOption('amqp-auth', 'off', 'AMQP service user:pass credentials', 'string');
relayPlugin.addOption('amqp-host', 'off', 'AMQP service host:port address', 'string');
relayPlugin.addOption('amqp-exchange', 'off', 'AMQP service target exchange', 'string');
relayPlugin.addOption('amqp-notifications', 'off', 'AMQP notification relay list', 'string');

relayPlugin.subscribe('channel_opened');
relayPlugin.subscribe('connect');
relayPlugin.subscribe('disconnect');
relayPlugin.subscribe('invoice_payment');
relayPlugin.subscribe('forward_event');
relayPlugin.subscribe('sendpay_success');
relayPlugin.subscribe('sendpay_failure');
relayPlugin.notifications.channel_opened.on('channel_opened', message => {publish('channel_opened', message)});
relayPlugin.notifications.connect.on('connect', message => {publish('connect', message)});
relayPlugin.notifications.disconnect.on('disconnect', message => {publish('disconnect', message)});
relayPlugin.notifications.invoice_payment.on('invoice_payment', message => {publish('invoice_payment', message)});
relayPlugin.notifications.forward_event.on('forward_event', message => {publish('forward_event', message)});
relayPlugin.notifications.sendpay_success.on('sendpay_success', message => {publish('sendpay_success', message)});
relayPlugin.notifications.sendpay_failure.on('sendpay_failure', message => {publish('sendpay_failure', message)});

relayPlugin.start();
