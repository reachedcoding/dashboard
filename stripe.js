if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

module.exports = class Stripe {

  constructor(stripePublicKey, stripeSecretKey) {
    this.stripeSecretKey = stripeSecretKey;
    this.stripePublicKey = stripePublicKey;
    this.stripe = require("stripe")(stripeSecretKey);
  }

  async create_customer(discord) {
    let customer = await this.stripe.customers.create({
      email: discord.email,
      metadata: {
          id: discord.id,
          username: discord.username,
          avatar: discord.avatar,
          discriminator: discord.discriminator,
          email: discord.email,
          verified: discord.verified,
          locale: discord.locale,
          mfa_enabled: discord.mfa_enabled,
          flags: discord.flags,
          premium_type: discord.premium_type
      }
    });
    return customer.id;
  }

  async create_payment_method(hostname, customer_id) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: customer_id,
      success_url: `https://${hostname}/payment-method?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://${hostname}/payment-method`,
    });
    return session.id;
  }

  async delete_all_cards(customer_id) {
    let paymentMethods =  await this.stripe.paymentMethods.list({customer: customer_id, type: 'card'});
    for (let i = 0; i < paymentMethods.data.length; i++) {
      await this.stripe.paymentMethods.detach(paymentMethods.data[i].id);
    }
  }

  async get_session(session_id) {
    let session = await this.stripe.checkout.sessions.retrieve(session_id, {expand: ['setupintent']});
    return session;
  }

  async create_setupIntent() {
    let setupIntent = await this.stripe.setupIntents.create({ payment_method_types: ['card'] });
  }

  async create_session(domain, price, name, description, image) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      payment_intent_data: {
        setup_future_usage: 'off_session',
        capture_method: 'manual',
      },
      line_items: [
        {
          name: name,
          description: description,
          amount: price,
          currency: 'usd',
          quantity: 1,
          images: [image]
        }
      ],
      // subscription_data: {
      //   items: [{
      //     plan: plan, // example = membership
      //   }],
      // },
      // make these pages
      success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/cancel`,
    });
    return {
      session: session,
      id: session.id,
      pi: session.payment_intent
    };
  }

  async create_sub(domain, plan) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      subscription_data: {
        items: [{
          plan: plan, // example = membership
        }],
      },
      // make these pages
      success_url: `${domain}/paid_subscription?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/`,
    });
    return {
      session: session,
      id: session.id,
      pi: session.payment_intent
    };
  }

  async create_plan(price, name) {
    let plan = await this.stripe.plans.create(
      {
        amount: price,
        currency: 'usd',
        interval: 'month',
        product: { name: name },
        id: `Amount_${price}`
      });
    return plan;
  }

  async get_plan(name) {
    try {
      let plan = await this.stripe.plans.retrieve(name);
      return plan;
    } catch (e) {
      return false;
    }
  }

  async capture_payment_intent(payment_intent) {
    let obj = await this.stripe.paymentIntents.capture(payment_intent);
    if (obj.status == "succeeded")
      return obj;
    else
      return null;
  }

  async cancel_payment_intent(payment_intent) {
    let obj = await this.stripe.paymentIntents.cancel(payment_intent);
    if (obj.status == "succeeded")
      return true;
    else
      return false;
  }

  async get_customer(cust_id) {
    return await this.stripe.customers.retrieve(cust_id);
  }

  async get_session(session_id) {
    return await this.stripe.checkout.sessions.retrieve(session_id);
  }

  async get_next_date(sub_id) {
    let subscription = await this.stripe.subscriptions.retrieve(sub_id);
    return subscription.current_period_end;
  }

  async pause_subscription(sub_id) {
    await this.stripe.subscriptions.update(sub_id, { cancel_at_period_end: true }, function (err, subscription) {
    });
  }

  async resume_subscription(sub_id) {
    await this.stripe.subscriptions.update(sub_id, { cancel_at_period_end: false }, function (err, subscription) {
    });
  }

  async delete_subscription(sub_id) {
    await this.stripe.subscriptions.del(sub_id);
  }

  async list_all_cards(cust_id) {
    let cards = await this.stripe.customers.listSources(
      cust_id,
      { limit: 1 });
    return cards;
  }

  async get_all_products() {
    let products = await this.stripe.products.list({ limit: 100 });
    return products;
  }

  async post_single_membership_product() {
    await stripe.products.create(
      {
        name: 'Membership',
        type: 'good',
        description: 'One-time membership purchase',
        attributes: ['size', 'gender'],
      },
      function (err, product) {
        // asynchronously called
      }
    );
  }
}