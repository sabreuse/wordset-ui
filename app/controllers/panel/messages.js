import Ember from 'ember';
import EmberValidations from 'ember-validations';
import ENV from '../../config/environment';
import { Bindings } from 'ember-pusher/bindings';

export default Ember.ArrayController.extend(Bindings, EmberValidations.Mixin, {
  logPusherEvents: (ENV.environment === 'development'),
  notifier: Ember.inject.service(),
  PUSHER_SUBSCRIPTIONS: {
    messages: ['push']
  },
  needs: ['application'],
  currentUser: Ember.computed.alias('controllers.application.currentUser'),
  chatReceived: Ember.computed.alias('controllers.application.chatReceived'),
  sortProperties: ['createdAt'],
  showUsers: false,
  sortAscending: true,
  showSettings: false,
  onlineUsers: function() {
    return this.store.metadataFor("message").online || [];
  }.property("model.@each"),
  validations: {
    text: {
      presence: true,
      length: { minimum: 1, maximum: 255 },
    },
  },
  init: function() {
    this._super();
    if(localStorage.notificationsEnabled) {
      this.set("notificationsEnabled", JSON.parse(localStorage.notificationsEnabled));
    }
  },
  actions: {
    submitMessage: function() {
      if(this.get("isValid")) {
        this.send("log", "messages", "sentchat");
        Ember.$.post(ENV.api + "/messages", {
          message: {
            text: this.get("text"),
            path: document.location.pathname
          },
        });
      }
      this.set("text", "");
    },
    push: function(data) {
      this.set("chatReceived", true);
      var meta = data.meta;
      delete data.meta;
      this.store.pushPayload('message', data);
      this.store.setMetadataFor('message', meta);
      if(this.get("notificationsEnabled") === true && (data.message.user !== this.get("currentUser"))) {
        // bubble up the notifier to the application controller
        this.send("browserNotification", data.message.user.id, data.message.text, "chat");
      }
    },
    toggleUsers: function() { this.toggleProperty("showUsers"); },
    toggleSettings: function() { this.toggleProperty("showSettings"); },
    enableNotifications: function() {
      var _this = this;
      Notification.requestPermission(function(result) {
        if(result === "granted") {
          _this.set("notificationsEnabled", true);
          _this.send("log", "notifications", "enabled");
          _this.get("notifier").show("We'll let you know when someone messages", {type: "Alert"});
          localStorage.notificationsEnabled = true;
        } else {
          _this.get("notifier").show("We can't notify because you said no. :(", {type: "Alert"});
        }
      });
    },
    disableNotifications: function() {
      this.set("notificationsEnabled", false);
      this.send("log", "notifications", "disabled");
      localStorage.notificationsEnabled = false;
      this.get("notifier").show("Notifications disabled", {type: "Alert"});
    },
    goToLink: function(link) {
      if(link) {
        this.send("log", "messages", "clickedlink");
        this.transitionToRoute(link);
      }
    },
  }
});
