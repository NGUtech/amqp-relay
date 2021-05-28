#!/usr/bin/env node
const amqplib = require('amqplib');
const Plugin = require('clightningjs');

const relayPlugin = new Plugin();
let amqp, username, password, hostname, port, exchange, delay, connectionInterval, vhost;
let prefix = 'lightningd.message.';
let enabledNotifications = {};

relayPlugin.onInit = function (params) {
  if (params.options['amqp-host'] !== 'off') {
    [hostname, port] = params.options['amqp-host'].split(':');
    relayPlugin.log('AMQP-relay: hostname = ' + hostname + ', port = ' + port);
  }

  if (params.options['amqp-auth'] !== 'off') {
    [username, password] = params.options['amqp-auth'].split(':');
    relayPlugin.log('AMQP-relay: username = ' + username + ', password = ' + password);
  }

  if (params.options['amqp-exchange'] !== 'off') {
    exchange = params.options['amqp-exchange'];
    relayPlugin.log('AMQP-relay: exchange = ' + exchange);
  }

  if (params.options['amqp-delay'] !== 0) {
    delay = params.options['amqp-delay'];
    relayPlugin.log('AMQP-relay: delay = ' + delay);
  }

  if (params.options['amqp-prefix'] !== 'off') {
    prefix = params.options['amqp-prefix'];
    relayPlugin.log('AMQP-relay: prefix = ' + prefix);
  }

  if (params.options['amqp-vhost'] !== 'off') {
    vhost = params.options['amqp-vhost'];
    relayPlugin.log('AMQP-relay: vhost = ' + vhost);
  }

  if (params.options['amqp-notifications'] !== 'off') {
    params.options['amqp-notifications'].split(',').forEach(
      event => {
        enabledNotifications[event] = true;
      }
    );
    relayPlugin.log('AMQP-relay: enabled notifications = ' + enabledNotifications);
  }

  if (hostname && exchange && Object.keys(enabledNotifications).length > 0) {
    connectExchange();
    connectionInterval = setInterval(connectExchange, 10000);
  } else {
    relayPlugin.log('AMQP-relay: AMQP plugin is installed but not enabled');
  }

  return true;
};

function connectExchange() {
  relayPlugin.log('AMQP-relay: Connecting to AMQP service at ' + hostname + ':' + port);
  // const endpoint = auth ? auth + '@' + host : host;
  amqplib.connect({
    username: username,
    password: password,
    hostname: hostname,
    port: port,
    vhost: vhost})
    .then(conn => conn.createChannel())
    .then(ch => {
      ch.on('error', err => {
        amqp = null;
        relayPlugin.log('AMQP-relay: AMQP channel error: ' + err.code);
        if (!connectionInterval) {
          connectionInterval = setInterval(connectExchange, 10000);
        }
      });
      ch.assertExchange(exchange, "topic", { durable: true })
        .then(() => {
          relayPlugin.log('AMQP-relay: Created exchange ' + exchange);
          return ch.checkExchange(exchange);
        })
        .then(() => {
          amqp = ch;
          clearInterval(connectionInterval);
          connectionInterval = false;
          relayPlugin.log('AMQP-relay: AMQP channel established');
        })
        .catch(err => { relayPlugin.log(err); });
    })
    .catch(err => {
      relayPlugin.log('AMQP-relay: AMQP connection error: ' + err.code);
    });
}

function publish(event, message) {
  relayPlugin.log('Got event: ' + event + ", with message: " + JSON.stringify(message));
  if (amqp && !connectionInterval && enabledNotifications[event] === true) {
    relayPlugin.log('Publishing event' + event);
    const eventJson = JSON.stringify(message);
    const headers = delay > 0 ? { headers: { 'x-delay': delay } } : {};
    amqp.publish(exchange, prefix + event, Buffer.from(eventJson), headers);
  }
}

relayPlugin.addOption('amqp-auth', 'off', 'AMQP service user:pass credentials', 'string');
relayPlugin.addOption('amqp-host', 'off', 'AMQP service host:port address', 'string');
relayPlugin.addOption('amqp-exchange', 'off', 'AMQP service target exchange', 'string');
relayPlugin.addOption('amqp-prefix', 'off', 'AMQP message routing prefix', 'string');
relayPlugin.addOption('amqp-delay', 0, 'AMQP message relay delay (in ms)', 'int');
relayPlugin.addOption('amqp-notifications', 'off', 'AMQP notification relay list', 'string');
relayPlugin.addOption('amqp-vhost', 'off', 'AMQP virtual host name', 'string');

relayPlugin.subscribe('channel_opened');
relayPlugin.subscribe('connect');
relayPlugin.subscribe('disconnect');
relayPlugin.subscribe('invoice_payment');
relayPlugin.subscribe('invoice_creation');
relayPlugin.subscribe('forward_event');
relayPlugin.subscribe('sendpay_success');
relayPlugin.subscribe('sendpay_failure');
relayPlugin.subscribe('coin_movement');
relayPlugin.notifications.channel_opened.on('channel_opened', message => { publish('channel_opened', message) });
relayPlugin.notifications.connect.on('connect', message => { publish('connect', message) });
relayPlugin.notifications.disconnect.on('disconnect', message => { publish('disconnect', message) });
relayPlugin.notifications.invoice_creation.on('invoice_creation', message => { publish('invoice_creation', message) });
relayPlugin.notifications.invoice_payment.on('invoice_payment', message => { publish('invoice_payment', message) });
relayPlugin.notifications.forward_event.on('forward_event', message => { publish('forward_event', message) });
relayPlugin.notifications.sendpay_success.on('sendpay_success', message => { publish('sendpay_success', message) });
relayPlugin.notifications.sendpay_failure.on('sendpay_failure', message => { publish('sendpay_failure', message) });
relayPlugin.notifications.coin_movement.on('coin_movement', message => { publish('coin_movement', message) });

relayPlugin.start();
