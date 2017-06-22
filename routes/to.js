/**
 * Created by Alejandro on 4/10/17.
 */
var express = require('express');
var router = express.Router();
var confFirebase = require('../firebase.js');
var _ = require('underscore');
// Android method
var gcm = require('node-gcm');
var sender = new gcm.Sender('yourGCMKeySender');
// iOS method
var apn = require('apn');
/*var options = {
};*/
var service = new apn.Provider({
    production: true,
    cert: '../certificates/prod/cert.pem',
    key: '../certificates/prod/key.pem'
    /*cert: '../certificates/dev/cert.pem',
    key: '../certificates/dev/key.pem'*/
});
service.on("connected", function () {
    console.log("Connected");
});
service.on("transmitted", function (notification, device) {
    console.log("Notification transmitted to:" + device.token.toString("hex"));
});
service.on("transmissionError", function (errCode, notification, device) {
    console.error("Notification caused error: " + errCode);
});
service.on("timeout", function () {
    console.log("Connection Timeout");
});
service.on("disconnected", function () {
    console.log("Disconnected from APNS");
});
service.on("socketError", console.error);

router.post('/medico', function (req, res) {
    console.log(req.body);
    if (!req.body.type || !req.body.name || !req.body.id_doc) return;

    confFirebase.database().ref('doctors').child(req.body.id_doc).once('value').then(function (snap) {

        if (!snap.val()) return;

        var mensaje = getMessage(req.body.type, req.body.id_doc, req.body.name);

        var android = _.map(_.where(snap.val(), {type: 'android'}), function (item) {
            return item.token;
        });
        var ios = _.map(_.where(snap.val(), {type: 'ios'}), function (item) {
            return item.token;
        });

        send_android(android, mensaje.titulo, mensaje.mensaje, mensaje.payload);
        send_ios(ios, mensaje.titulo, mensaje.mensaje, mensaje.payload);

        return res.send(mensaje);
    }).catch(function (e) {
        console.error(e);
    });

});

router.post('/user', function (req, res) {
    console.log(req.body);
    //if (!req.body.type || !req.body.id_user || !req.body.id_coach)

        confFirebase.database().ref('users').child(req.body.id_user).once('value').then(function (snap) {
            if (!snap.val()) return;

            console.log(snap.val());

            var mensaje = getMessage(req.body.type, req.body.id_user, req.body.name);

            var android = _.map(_.where(snap.val(), {type: 'android'}), function (item) {
                return item.token;
            });
            var ios = _.map(_.where(snap.val(), {type: 'ios'}), function (item) {
                return item.token;
            });

            send_android(android, mensaje.titulo, mensaje.mensaje, mensaje.payload);
            send_ios(ios, mensaje.titulo, mensaje.mensaje, mensaje.payload);

            return res.send(mensaje);
        }).catch(function (e) {
            console.error(e);
        });

});

function getMessage(type, id, name) {

    //console.log('ID: '+id,' NAME: '+name);

    var message = {
        titulo: "MY APP",
        payload: {}
    };

    message.mensaje = 'Content';
    message.payload.state = 'state.to.redirect';
    
    return message;
}

function send_android(devices, titulo, mensaje, payload) {
    console.log(mensaje);
    var message = new gcm.Message({'content-available': '1'});
    message.addData("title", titulo);
    message.addData("message", mensaje);
    message.addData('style', 'inbox');
    message.addData('payload', payload);
    message.addData('content-available', '1');
    sender.send(message, devices
        , function (err, res) {
            console.log(err, res);
        }
    );
}

function send_ios(devices, titulo, mensaje, payload) {
    var note = new apn.Notification();
    note.badge = 1;
    note.contentAvailable = 1;
    note.alert = titulo + ": " + mensaje;
    note.sound = 'ping.aiff';
    note.payload = {payload: payload};
    service.send(note, devices).then(function (result) {
        console.log("sent:", result.sent.length);
        console.log("failed:", result.failed.length);
        console.log(result.failed);
        /*console.log('Push Notification Response:', res);
        console.log(res.failed);*/
    });
}

module.exports = router;
