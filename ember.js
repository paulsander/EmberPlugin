// Ember plug-in scripts
// Handles assigning a callback into the Word count plug-in and
// calculating diminishing exp gains.

/*
	Javascript object format
	{
		last_posted_timestamp: <number>,
		posts_this_month: <number>
	}
*/

if (typeof ember == "undefined")
{
	ember = {
		images: {},
		settings: {},
		keyID: "ember_data",

		init: function(){
			if(this.setup()) {
				$(this.ready.bind(this));
			}
		},
		
		setup: function() {
			var plugin = pb.plugin.get("ember_rp_system");
			
			if(plugin) {
					this.settings = plugin.settings;
					this.images = plugin.images;
				
			return true;
			}
			return false;
		},

		ready: function() {
			var eton = window.eton;
			eton.eton_word_count.calc_money({}, this.wordcountcallback);
		},

		calc_exp: function(post_count) {
			var start_exp = parseInt(ember.settings.starting_exp);			// Base amount of exp
			var decay_rate = parseInt(ember.settings.exp_decay_rate);		// How many posts before going down to the next exp step
			var decay_amt = parseInt(ember.settings.exp_decay_amount);		// How much the exp drops per step
			var minimum_amt = parseInt(ember.settings.minimum_exp_awarded);	// The minimum aount of exp to award;
		
			var calculated_value = start_exp - Math.floor(post_count/decay_rate) * decay_amt;

			return (calculated_value > minimum_amt) ? calculated_value : minimum_amt;
		},

		// 'this' is the monetary plug-in
		// 'm' might be posting mode? Full thread, full reply, quick reply?
		// 'c' is the current amount of points already being awarded
		// 'l' is 'plugin.settings.word_up.sort(function(a, b) {...}'
		// return value is the amount of bonus exp to award.
		wordcountcallback: function(wordcount_data, m, c, l) {
			for(var propname in wordcount_data)
			{
				// If the post isn't over the threshold don't even start.
				var word_count_threshold = parseInt(ember.settings.word_count_threshold);
				if (wordcount_data.last_word_count < word_count_threshold) {
					return 0;
				}

				// Get and setup all of our data.
				var user_key = yootil.key.get_key(ember.keyID);
				
				var user_data = user_key.get();

				// Clean up data, in necessary;
				if ("object" != typeof user_data)
				{
					user_data = {};
				}

				var temp1 = parseInt(user_data.last_posted_timestamp);
				user_data.last_posted_timestamp = temp1 ? temp1 : 0;

				var temp2 = parseInt(user_data.posts_this_month);
				user_data.posts_this_month = temp2 ? temp2 : 0;
				
				// Next we check the timestamp and see if we need to reset the post count...
				var last_posted_date = new Date(user_data.last_posted_timestamp);
				
				var current_post_date = new Date();

				if (!(last_posted_date.getMonth() == current_post_date.getMonth()
					&& last_posted_date.getFullYear() == current_post_date.getFullYear()))
				{
					user_key.posts_this_month = 0;
				}

				var newexp = ember.calc_exp(user_data.posts_this_month);

				user_data.last_posted_timestamp = current_post_date.getTime();
				user_data.posts_this_month++;

				yootil.key.set(ember.keyID, user_data);

				return newexp;
			}
		}
	};

	ember.init();
}