if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublicKey = process.env.STRIPE_PUBLIC_KEY;

const stripe = require("stripe")(stripeSecretKey);

var price = price * 100;
var stripeHandler = stripe.configure({
  key: stripePublicKey,
  locale: "auto",
  token: function (token) {
    console.log(token);
  }
});

function renew(id) {
  stripeHandler.open({
    amount: price
  })
}

function subscribe(plan_, customer_) {
  stripe.subscriptions.create(
    {
      customer: customer_,
      items: [{ plan: plan_ }],
    },
    function (err, subscription) {
      if (err) {
        console.log(err);
      }
      else {
        
      }
    }
  );
}

function cancel_subscription(id) {
  stripe.subscriptions.del(
    id,
    function (err, confirmation) {
      
    });
}