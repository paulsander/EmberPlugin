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
		},

		calc_exp: function(post_count) {
			var start_exp = parseInt(ember.settings.starting_exp);			// Base amount of exp
			var decay_rate = parseInt(ember.settings.exp_decay_rate);		// How many posts before going down to the next exp step
			var decay_amt = parseInt(ember.settings.exp_decay_amount);		// How much the exp drops per step
			var minimum_amt = parseInt(ember.settings.minimum_exp_awarded);	// The minimum aount of exp to award;
		
			var calculated_value = start_exp - Math.floor(post_count/decay_rate) * decay_amt;

			return (calculated_value > minimum_amt) ? calculated_value : minimum_amt;
		},
		getUserData: function(id)
		{
			var data = yootil.key.get_key(ember.keyID).get(id);

			data = typeof data == "object" ? data : {};

			data.last_posted_timestamp =  parseInt(data.last_posted_timestamp) || 0;
			data.posts_this_month = parseInt(data.posts_this_month) || 0;

			return data;
		},
		saveUserData: function(data, id)
		{
			return yootil.key.set(ember.keyID, data, id);
		},
		checkMonthChanged: function(firstDate, secondData)
		{
			return !(firstDate.getMonth() == secondData.getMonth()
				&& firstData.getFullYear() == secondDate.getFullYear());
		},
		// 'this' is the monetary plug-in
		// 'm' might be posting mode? Full thread, full reply, quick reply?
		// 'c' is the current amount of points already being awarded
		// 'l' is 'plugin.settings.word_up.sort(function(a, b) {...}'
		// return value is the amount of bonus exp to award.
		// ** DEPRICATED **: This is sticking around to keep the logic for reference
		// but will be removed eventually.
		wordcountcallback: function(wordcount_data, m, c, l) {
			for(var propname in wordcount_data)
			{
				// If the post isn't over the threshold don't even start.
				var word_count_threshold = parseInt(ember.settings.word_count_threshold);
				if (wordcount_data.last_word_count < word_count_threshold) {
					return 0;
				}
				
				var user_data = ember.getUserData();

				// Next we check the timestamp and see if we need to reset the post count...
				var last_posted_date = new Date(user_data.last_posted_timestamp);
				
				var current_post_date = new Date();

				if (ember.checkMonthChanged(current_post_date, last_posted_date))
					user_data.posts_this_month = 0;

				var newexp = ember.calc_exp(user_data.posts_this_month);

				user_data.last_posted_timestamp = current_post_date.getTime();
				user_data.posts_this_month++;

				ember.saveUserData(user_data);

				return newexp;
			}
		}
	};

	ember.init();
}