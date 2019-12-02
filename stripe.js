if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

module.exports = class Stripe {

  constructor(stripePublicKey, stripeSecretKey) {
    this.stripeSecretKey = stripeSecretKey;
    this.stripePublicKey = stripePublicKey;
    this.stripe = require("stripe")(stripeSecretKey);
  }

  async create_session(plan, domain) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      subscription_data: {
        items: [{
          plan: plan,
        }],
      },
      // make these pages
      success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/cancel`,
    });
    return session.id;
  }

  async get_next_date(sub_id) {
    let subscription = await this.stripe.subscriptions.retrieve(sub_id);
    return subscription.current_period_end;
  }

	async pause_subscription(sub_id) {
		await this.stripe.subscriptions.update(sub_id, {cancel_at_period_end: true}, function (err, subscription) {
      
    }); 
	}
}