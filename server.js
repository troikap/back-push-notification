const webpush = require('web-push');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const admin = require('firebase-admin');
const serviceAccount = require('./firesbase.json');
// const vapidKeys = {
//     "publicKey": "BFBEdXOwCUCOMxr4sGpPRrefIBd2SYx4XLgx8Tfyih-wd2ozVfO6OsKAH1s_pgFbrA1AtTlk05E02Qcy1rxI3s0",
//     "privateKey": "QQEacVAb3JzyfXVZJx2AsR2poohZPX_LNbSV0kveymI",
// }

let tokens = [];

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())

app.use(cors());


// webpush.setVapidDetails(
//     'mailto:example@yourdomain.org',
//     vapidKeys.publicKey,
//     vapidKeys.privateKey,
// )

// const enviarNotificacion = (req, res) => {
//     const pushSubscription = { 
//         endpoint: DataTransfer.tokens.endpoint,
//         keys: {
//             auth: DataTransfer.tokens.keys.auth,
//             p256dh: DataTransfer.tokens.keys.p256dh
//         }
//     }
//     const payload = this.notificationPayload;
//     webpush.sendNotification(pushSubscription, JSON.stringify(payload))
//     .then( res => {
//         console.log('ENVIADO...........');
//     }).catch( err => {
//         console.log('ERROR ', err);
//     })
// }

saveToken = (req, res) => {
    console.log('req body', req.body);
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
            user: req.body.user || `Usuario Nº ${tokens.length}`
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
    console.log('TOKEN ', tokens);
    res.send({
        data: tokens,
        message: 'Debes guardar estos datos en tu BASE de DATOS'
    })
}

sendPushNotificationFirebase = async (req, res) => {
    const {tokens, title, message, image} = req.body;
    const payload = {
        notification: {
            title: title || 'Título de la notificación',
            body: message || 'Cuerpo de la notificación',
            image: image || 'null',
        },
        apns: {
            payload: {
                aps: {
                    'mutable-content': 1
                }
            },
            fcm_options: {
                image: image || 'null',
            }
        },
        webpush: {
            headers: {
                image: image || 'null',
            }
        },
        data: {
            image: image || '',
        },
        token: '', // El token del dispositivo receptor
    };
    if (image) {
        payload['android'] = {notification: {
            imageUrl: image,
            image: image
        }}
    }
    let responseMessage = null;
    console.log('payload: ', payload);
    for( let tokenIndex in tokens) {
        payload.token = tokens[tokenIndex].token;
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

app.route('/api/send-push-notification-firebase').post(sendPushNotificationFirebase);
app.route('/api/tokens').post(saveToken);
app.route('/api/tokens').get(getToken);

app.get('/api/hello', (req, res) => {
    console.log('LLEGOOOOOO HOLAAAAAAAAAAa');
    const informacion = {
      mensaje: 'Esta es la información que deseas obtener.'
    };
    res.json(informacion);
});

// const notificationPayload = {
//     "notification": {
//         "title": "SALUDOS SSSS ",
//         "body": "PUSH NOTIFICACIONES ENVIADAS",
//         "vibrate": [100, 50, 100],
//         "image": "https://img.freepik.com/psd-gratis/icono-3d-animales-acuaticos_23-2150049501.jpg",
//         "data": {
//             "dataOfArrival": Date.now(),
//             "primaryKey": 1
//         },
//         "actions": [{
//             "action": "explore",
//             "title": "Go to the site"
//         }]
//     }
// }

// webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload))
// .then( res => {
//     console.log('ENVIADO...........');
// }).catch( err => {
//     console.log('ERROR ', err);
// })



admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Otras opciones, si es necesario
});

const httpServer = app.listen(9000, () => {
    console.log("HTTP Server running at http://localhost:" + httpServer.address().port)
})