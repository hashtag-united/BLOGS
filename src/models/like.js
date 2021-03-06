const mongoose = require('mongoose')
const validator = require('validator')
const { Expo } = require('expo-server-sdk')
const User = require('../models/user')
const Blog = require('../models/blog')

const likeSchema = new mongoose.Schema({
    likedBy:{
        type: mongoose.Schema.Types.ObjectId,
        required:true,
        trim:true
    },
    blog:{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
},{
    timestamps:true
})

likeSchema.statics.findDuplicates = async (likeId,blogId) =>{
    const exists = await Like.findOne({likedBy:likeId,blog:blogId})
    return exists
}

//ExponentPushToken[7WFHXhIJmaCtrglObn_kWJ]
likeSchema.pre('save',async function(next,arg) {

    const like = this
    
    const blog = await Blog.findById(like.blog)
    const user = await User.findById(blog.owner)

    console.log(user.email)
    let messages = []
    let expo = new Expo()
      for (let pushTokens of user.notifTokens) {
        // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
        let pushToken = pushTokens.notifToken
       console.log(pushToken)
        // Check that all your push tokens appear to be valid Expo push tokens
        if (!Expo.isExpoPushToken(pushToken)) {
          console.log(`Push token ${pushToken} is not a valid Expo push token`);
          continue;
        }
       
        // Construct a message (see https://docs.expo.io/versions/latest/guides/push-notifications)
        messages.push({
            to:pushToken,
            sound: 'default',
            body: `Hey ${user.name}, ${arg.name} liked your blog`,
            data: { withSome: 'data' },
          })
      }

let chunks = expo.chunkPushNotifications(messages);
let tickets = [];
(async () => {
  
  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log(ticketChunk);
      tickets.push(...ticketChunk);
      
    } catch (error) {
      console.error(error);
    }
  }
})();

let receiptIds = [];
for (let ticket of tickets) {

  if (ticket.id) {
    receiptIds.push(ticket.id);
  }
}


let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
(async () => {
  // Like sending notifications, there are different strategies you could use
  // to retrieve batches of receipts from the Expo service.
  for (let chunk of receiptIdChunks) {
    try {
      let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      console.log(receipts);

      // The receipts specify whether Apple or Google successfully received the
      // notification and information about an error, if one occurred.
      for (let receiptId in receipts) {
        let { status, message, details } = receipts[receiptId];
        if (status === 'ok') {
          continue;
        } else if (status === 'error') {
          console.error(
            `There was an error sending a notification: ${message}`
          );
          if (details && details.error) {
            // The error codes are listed in the Expo documentation:
            // https://docs.expo.io/versions/latest/guides/push-notifications/#individual-errors
            // You must handle the errors appropriately.
            console.error(`The error code is ${details.error}`);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
})();


next() 
})
const Like = mongoose.model('Like',likeSchema)

module.exports = Like