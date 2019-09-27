const activeUser = require('./utility/ActiveUsers');
let socketIO;
const activityService = require('./service/ActivityService');

module.exports.storeSocket = (socket) => {
    socketIO = socket;
    socketIO.on('connection', async function (socket) {
        socket.on('userInfo', async function (user) {
            user.ipAddress = socket.request.connection.remoteAddress;
            user.connectionID = socket.id;
            await activityService.auditSupplierLogin(user);
            await activeUser.updateActivity(user);
            await emitParticipantsToBuyer();
            // let auctionsforEMIT = await activeUser.getAuctionsForEmit();
            // auctionsforEMIT.map(async (auction) => {
            //     let activeUsers = await activeUser.getActiveUsers(auction.auctionID);
            //     socketIO.emit(`emitAuction-${auction.auctionID}`, activeUsers);
            // })
        });
        socket.on('disconnectUser', async function (user) {
            user.ipAddress = socket.request.connection.remoteAddress;
            if (user.auctionID) {
                await activityService.auditSupplierLogoutWithAuctionId(user);
            } else {
                await activityService.auditSupplierLogoutWithoutAuctionID(socket.id, 'Offline')
            }
            await activeUser.updateUsersToOffline(user);
            await emitParticipantsToBuyer();
            // let auctionsforEMIT = await activeUser.getAuctionsForEmit();
            // auctionsforEMIT.map(async (auction) => {
            //     let activeUsers = await activeUser.getActiveUsers(auction.auctionID);
            //     socketIO.emit(`emitAuction-${auction.auctionID}`, activeUsers);
            // })
        });
        socket.on('disconnect', async function () {
            const status = 'Offline';
            await activityService.auditSupplierLogoutWithoutAuctionID(socket.id, status)
            await activeUser.changeStatus(socket.id, status);
            await emitParticipantsToBuyer();
            // let auctionsforEMIT = await activeUser.getAuctionsForEmit();
            // auctionsforEMIT.map(async (auction) => {
            //     let activeUsers = await activeUser.getActiveUsers(auction.auctionID);
            //     socketIO.emit(`emitAuction-${auction.auctionID}`, activeUsers);
            // })
        });
    });
}

module.exports.socketEmit = async (key, value) => {
    await socketIO.emit(key, value);
    return true;
};

const emitParticipantsToBuyer = async () => {
    let auctionsforEMIT = await activeUser.getAuctionsForEmit();
    for (let eachAuction of auctionsforEMIT) {
        let activeUsers = await activeUser.getActiveUsers(eachAuction.auctionID);
        await socketIO.emit(`emitAuction-${eachAuction.auctionID}`, activeUsers);
    }
    return true;
};

module.exports.emitParticipantsToBuyer = emitParticipantsToBuyer;