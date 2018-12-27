// Ember plug-in scripts
// Handles assigning a callback into the Word count plug-in and
// calculating diminishing exp gains.

/*
	Javascript object format
	{
		last_posted_timestamp: <number>,
		posts_this_month: <number>,
		experience: <number>
	}
*/

if (typeof ember == "undefined")
{
	ember = {
		images: {},
		settings: {},
		keyID: "ember_data",
		processed: false,

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
			// So the first thing we'll do is check and see if we need to bind on the submit action
			var the_form;

			if(yootil.location.posting()){
				the_form = yootil.form.post();
			} else if(yootil.location.thread()){
				the_form = yootil.form.post_quick_reply();
			}
			
			var currentboard = yootil.page.board.id();
			var ic_areas = this.settings.ic_areas;

			if(!this.processed
				&& the_form && the_form.length
				&& $.inArray(currentboard.toString(), ic_areas) != -1){
				the_form.bind("submit", function(event) {
						ember.apply_experience();	
				})
			}
		},
		apply_experience: function() {
			this.processed = true;
			if(typeof eton == "undefined" || typeof eton.eton_word_count == "undefined" )
			{
				console.log(">> Word count plugin not installed!");
				return;
			}

			var wordcount = eton.eton_word_count.last_word_count;
			// If the post isn't over the threshold don't even start.
			var word_count_threshold = parseInt(ember.settings.word_count_threshold);
			if (wordcount < word_count_threshold) {
				return;
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
			user_data.experience += newexp;

			ember.saveUserData(user_data);
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
			data.experience = parseInt(data.experience) || 0;

			return data;
		},
		saveUserData: function(data, id)
		{
			return yootil.key.set(ember.keyID, data, id);
		},
		checkMonthChanged: function(firstDate, secondDate)
		{
			return !(firstDate.getMonth() == secondDate.getMonth()
				&& firstDate.getFullYear() == secondDate.getFullYear());
		}
	};

	ember.init();
}