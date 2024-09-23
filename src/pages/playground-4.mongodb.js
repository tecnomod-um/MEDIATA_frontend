// Switch to the correct database
use('taniwha');

// Insert multiple documents into the 'nodes' collection
db.getCollection('nodes').insertMany([
  {
    "ip": "localhost",
    "port": 8082,
    "name": "BARTHEL",
    "description": "This is the description for the new node",
    "color": "#FF5733",
    "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0n5LojkgGzAK3h8mCAF4R4aZ8pTfGG/Rt4zy9bg04fq4oFMkTiUyMEhTvttIWWO/TW2pjQuwlVDAxsX+//2A9ZweTcktT7GyNWo7saThvYSS9iMO1JAaSoJx63+JHFNECPAJ7hlclKhvv6HEWRPixM39yGzGQRx0crZZiHbF0GIveLs79/k5D57B/9glQzT3fihX2k4BGsJa1lNEopPEeJynoiQc1lT2UHV4QK3dzk2QxJJ0aF1MbjaupceK/04QTk2bL+XezGmzFUjVxOtFosILIMMMfoHGXCb+jfDGMNRsUMzLIs40+tAT7jm45x6Y640neu5DMGdvP9cbFVcXfQIDAQAB",
    "_class": "org.taniwha.model.NodeInfo"
  },
  {
    "ip": "localhost",
    "port": 8083,
    "name": "SIMAVI",
    "description": "This is the description for the new node",
    "color": "#33FF57",
    "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlm5LojkgGzAK3h8mCAF4R4aZ8pTfGG/Rt4zy9bg04fq4oFMkTiUyMEhTvttIWWO/TW2pjQuwlVDAxsX+//2A9ZweTcktT7GyNWo7saThvYSS9iMO1JAaSoJx63+JHFNECPAJ7hlclKhvv6HEWRPixM39yGzGQRx0crZZiHbF0GIveLs79/k5D57B/9glQzT3fihX2k4BGsJa1lNEopPEeJynoiQc1lT2UHV4QK3dzk2QxJJ0aF1MbjaupceK/04QTk2bL+XezGmzFUjVxOtFosILIMMMfoHGXCb+jfDGMNRsUMzLIs40+tAT7jm45x6Y640neu5DMGdvP9cbFVcXfQIDAQAB",
    "_class": "org.taniwha.model.NodeInfo"
  },
  {
    "ip": "localhost",
    "port": 8084,
    "name": "Guttmann",
    "description": "This is the description for the new node",
    "color": "#3357FF",
    "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlm5LojkgGzAK3h8mCAF4R4aZ8pTfGG/Rt4zy9bg04fq4oFMkTiUyMEhTvttIWWO/TW2pjQuwlVDAxsX+//2A9ZweTcktT7GyNWo7saThvYSS9iMO1JAaSoJx63+JHFNECPAJ7hlclKhvv6HEWRPixM39yGzGQRx0crZZiHbF0GIveLs79/k5D57B/9glQzT3fihX2k4BGsJa1lNEopPEeJynoiQc1lT2UHV4QK3dzk2QxJJ0aF1MbjaupceK/04QTk2bL+XezGmzFUjVxOtFosILIMMMfoHGXCb+jfDGMNRsUMzLIs40+tAT7jm45x6Y640neu5DMGdvP9cbFVcXfQIDAQAB",
    "_class": "org.taniwha.model.NodeInfo"
  },
  {
    "ip": "localhost",
    "port": 8085,
    "name": "Besta",
    "description": "This is the description for the new node",
    "color": "#FF33A1",
    "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlm5LojkgGzAK3h8mCAF4R4aZ8pTfGG/Rt4zy9bg04fq4oFMkTiUyMEhTvttIWWO/TW2pjQuwlVDAxsX+//2A9ZweTcktT7GyNWo7saThvYSS9iMO1JAaSoJx63+JHFNECPAJ7hlclKhvv6HEWRPixM39yGzGQRx0crZZiHbF0GIveLs79/k5D57B/9glQzT3fihX2k4BGsJa1lNEopPEeJynoiQc1lT2UHV4QK3dzk2QxJJ0aF1MbjaupceK/04QTk2bL+XezGmzFUjVxOtFosILIMMMfoHGXCb+jfDGMNRsUMzLIs40+tAT7jm45x6Y640neu5DMGdvP9cbFVcXfQIDAQAB",
    "_class": "org.taniwha.model.NodeInfo"
  }
]);
