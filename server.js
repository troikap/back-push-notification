const webpush = require('web-push');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const admin = require('firebase-admin');
const serviceAccount = require('./firesbase.json');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors());

let tokens = [];

saveToken = (req, res) => {
    console.log('saveToken req body', req.body);
    if (req.body?.token) {
        const tokenFinded = tokens.find(element => element.token == req.body.token);
        if (tokenFinded) {
            if (req.body.user) {
                tokens.forEach(element => {
                 if (element.token == req.body.token) element.user = req.body.user;
                })
            }
            return res.send({
                data: tokens,
                message: 'TOKEN AGREGADO'
            })
        }
        const payload = {
            token: req.body.token,
            user: req.body.user || `Usuario Nº ${tokens.length}`,
            device: req.body.device
        }
        tokens.push(payload);
        res.send({
            data: tokens,
            message: 'TOKEN AGREGADO'
        })
    } else {
        res.status(400).send({
            message: `TOKEN ERRONEO`
        })
    }
}

getToken = (req, res) => {
    const response = {
        data: tokens,
        message: 'Debes guardar estos datos en tu BASE de DATOS'
    }
    res.json(response);
}

getHello = (req, res) => {
    console.log('LLEGOOOOOO HOLAAAAAAAAAAa');
    const response = {
      mensaje: 'Esta es la información que deseas obtener.'
    };
    res.json(response);
}

sendPushNotificationFirebase = async (req, res) => {
    const {tokens, title, message, image} = req.body;
    let payload = { token: '' }
    if (image) {
        payload['data'] = {
            title: title,
            body: message,
            image,
            'notification-type': `NOT-IMG`, 
            'notification-value': `${title} - ${message}`
        };
        payload['notification'] = {
            title: title,
            body: message,
            imageUrl: image
        }
    } else {
        payload['data'] = { 
            'notification-type': `NOT`, 
            'notification-value': `${title} - ${message}`
        }
        payload['notification'] = {
            title: title,
            body: message,
        }
    }
    let responseMessage = null;
    for( let tokenIndex in tokens) {
        payload.token = tokens[tokenIndex].token?.value || tokens[tokenIndex].token;
        if (tokens[tokenIndex].device == 'ios') {
            // payload['topic'] = 'push-ios';
        }
        if (tokens[tokenIndex].device == 'android') {
            // payload['topic'] = 'push-android';
            // if (image) {
            //     !payload['android'] && (payload['android'] = {'notification': {}});
            //     payload['android']['notification']['imageUrl'] = image;
            // }
        }
        console.log('payload: ', payload);
        await admin.messaging().send(payload)
        .then((response) => {
            console.log('Notificación push enviada con éxito:', response);
        })
        .catch((error) => {
            console.error('Error al enviar la notificación push:', error);
            responseMessage += error.message;
        });
        if (tokenIndex+1 == tokens.length) {
            if (!responseMessage) {
                res.send({
                    message: 'Push notification enviada correctamente'
                })
            } else {
                console.log('ERROR ');
                res.status(400).send({
                    message: `Problemas al enviar la push notification: ${responseMessage}`
                })
            }
        }
    }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.route('/api/send-push-notification-firebase').post(sendPushNotificationFirebase);
app.route('/api/tokens').post(saveToken);
app.route('/api/tokens').get(getToken);
app.route('/api/hello').get(getHello)

const httpServer = app.listen(9000, () => {
    console.log("HTTP Server running at http://localhost:" + httpServer.address().port)
})