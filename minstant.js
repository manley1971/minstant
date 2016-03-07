Chats = new Mongo.Collection("chats");

if (Meteor.isClient) {
  // set up the main template the the router will use to build pages
  Router.configure({
    layoutTemplate: 'ApplicationLayout'
  });
  // specify the top level route, the page users see when they arrive at the site
  Router.route('/', function () {
    console.log("rendering root /");
    this.render("navbar", {to:"header"});
    this.render("lobby_page", {to:"main"});
  });

  // specify a route that allows the current user to chat to another users
  Router.route('/chat/:_id', function () {
    if (!Meteor.userId()) {
      console.log("Security alert: trying to chat but not logged in");
      this.render("navbar", {to:"header"});
      this.render("lobby_page", {to:"main"});
    }

    // the user they want to chat to has id equal to
    // the id sent in after /chat/...
    var otherUserId = this.params._id;
    // find a chat that has two users that match current user id
    // and the requested user id
    var filter = {$or:[
                {user1Id:Meteor.userId(), user2Id:otherUserId},
                {user1Id:otherUserId, user2Id:Meteor.userId()}
                ]};
    var chat = Chats.findOne(filter);
    if (!chat){// no chat matching the filter - need to insert a new one
      Meteor.call("insertChat",Meteor.userId(),otherUserId);
      chat = Chats.findOne(filter);
    }

   chatId = chat._id;

    if (chatId){// looking good, save the id to the session
      Session.set("chatId",chatId);
    }
    this.render("navbar", {to:"header"});
    this.render("chat_page", {to:"main"});
  });

  ///
  // helper functions
  ///
  Template.available_user_list.helpers({
    users:function(){
      return Meteor.users.find();
    }
  })
 Template.available_user.helpers({
    getUsername:function(userId){
      user = Meteor.users.findOne({_id:userId});
      return user.profile.username;
    },
    isMyUser:function(userId){
      if (userId == Meteor.userId()){
        return true;
      }
      else {
        return false;
      }
    }
  })


  Template.chat_page.helpers({
    messages:function(){
      var chat = Chats.findOne({_id:Session.get("chatId")});
      return chat.messages;
    },
    other_user:function()
    {
      var chat = Chats.findOne({_id:Session.get("chatId")});
      return chat.user2Id;
    },
  });

 Template.chat_page.events({
  // this event fires when the user sends a message on the chat page
  'submit .js-send-chat':function(event){
    // stop the form from triggering a page reload
    event.preventDefault();
    if (!Meteor.userId()) {
      //not logged in, do not insert a chat
      console.log ("Error: not logged in.")
      return false;
    }
    user = Meteor.users.findOne({_id:Meteor.userId()});
    Meteor.call("insertChatData",
                  event.target.chat.value,
                  user.profile.avatar,
                  user.profile.username,
                  Session.get("chatId"));
    // reset the form
    event.target.chat.value = "";
    }
 });
}


// start up script that creates some users for testing
// users have the username 'user1@test.com' .. 'user8@test.com'
// and the password test123

if (Meteor.isServer) {
  Meteor.startup(function () {

    if (!Meteor.users.findOne()){
      for (var i=1;i<9;i++){
        var email = "user"+i+"@test.com";
        var username = "user"+i;
        var avatar = "ava"+i+".png"
        console.log("creating a user with password 'test123' and username/ email: "+email);
        Meteor.users.insert({profile:{username:username, avatar:avatar}, emails:[{address:email}],services:{ password:{"bcrypt" : "$2a$10$I3erQ084OiyILTv8ybtQ4ON6wusgPbMZ6.P33zzSDei.BbDL.Q4EO"}}});
      }
    }
  });
}


  Meteor.methods({
    insertChatData: function(text,avatar,sent_by,chatId){
    // see if we can find a chat object in the database
    // to which we'll add the message
    var chat = Chats.findOne({_id:chatId});
    console.log("insert into chat:"+JSON.stringify(chat));
    if (chat){// ok - we have a chat to use
      if (this.userId==chat.user1Id || this.userId==chat.user2Id) {
        var msgs = chat.messages; // pull the messages property
        if (!msgs){// no messages yet, create a new array
          msgs = [];
        }
        msgs.push({text: text,avatar:avatar,sent_by:sent_by});
        // reset the form
        // put the messages array onto the chat object
        chat.messages = msgs;
        // update the chat object in the database.
        Chats.update(chat._id, chat);
      }
      else {
        console.log("Security alert: Wrong user is logged in.")
      }
      }},
    insertChat: function(user1,user2){

      Chats.insert({user1Id:user1, user2Id:user2});
    }
  });
