var express = require('express');
var app = express();

app.use(express.static(__dirname + '/'));
const port=process.env.port || 5000;
var server = app.listen(port, function () {
    console.log("Server running on port 5000..");
});

var io = require('socket.io').listen(server);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html')
});

var users = [];

io.on('connection', function (socket) {

    socket.on("naa-nagtype",(data)=>{
        socket.broadcast.emit("naa-nagtype",data)
    })

    var user = {
        username: socket.handshake.query['username'],
        status: 'online',
        socketId: socket.id
    };

    acceptUser(socket, user);

    // listen message event
    socket.on('message', function (data) {

        if (data.receiver == 'everyone') {
            socket.broadcast.emit('message', data);
        } else {
            var socketId = getSocketId(data.receiver);
            socket.broadcast.to(socketId).emit('message', data); // receiver
        }
    });

    // listen disconnect event
    socket.on('disconnect', function () {
        
        console.log(user.username + ' disconnected.');
        sendSysteemMessage(socket, user.username + ' disconnected.');

        // remove user from users array
        users.splice(users.indexOf(user), 1);

        console.log(users);
        io.emit('users', users);
    });





function acceptUser(socket, user) {

    var userFound = false;
    if (users) {
        for (var i = 0; i < users.length; i++) {
            if (users[i]['username'] == user.username) {
                users[i]['status'] = 'online';
                userFound = true;
            }
        }
    }
    // this part validates the user and dispaly its username and a message
    
    if (!userFound) {
        users.push(user)
        io.to(socket.id).emit('user_validation', {
            success: true
        });

        // send system message to clients
        sendSysteemMessage(socket, user.username + ' joined chat.');

        // send users to all clients
        io.emit('users', users);        
        console.log(user.username + ' joined chat..');
        console.log("users: ", users);

    } else {
        io.to(socket.id).emit('user_validation', {
            success: false
        });

        socket.disconnect();
    }
}




function sendSysteemMessage(socket, message) {
    
    var date = new Date();
    var systemMessage = {
        username: 'system',
        message: message,
        type: 'info',
        date: date,
        time: pad(date.getHours()) + ':' + pad(date.getMinutes())
    };
    socket.broadcast.emit('message', systemMessage);
}

function getSocketId(username) {
    for (var i = 0; i < users.length; i++) {
        if (users[i]['username'] == username) {
            return users[i]['socketId'];
        }
    }
}

function pad(value) {
    return value.toString().length > 1 ? value : '0' + value;
}

});
