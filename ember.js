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
		route: null,
		params: null,
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
				this.route = (proboards.data("route") && proboards.data("route").name) ? proboards.data("route").name.toLowerCase() : "";
				this.params = (this.route && proboards.data("route").params) ? proboards.data("route").params : "";

				return true;
			}

			return false;
		},

		ready: function() {
			// Check for profile/miniprofile replacements
			var location_check = (yootil.location.search_results() || yootil.location.message_thread() || yootil.location.thread() || yootil.location.recent_posts());
			if (location_check) {
				this.show_in_mini_profile();
				yootil.ajax.after_search(this.show_in_mini_profile, this);
			}
			
			if(yootil.location.profile_home() && this.params && this.params.user_id != "undefined"){
				this.show_in_profile();
			}

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

		show_in_mini_profile: function()
		{
			var minis = $("div.mini-profile");

			if(minis && minis.length){
				// There's a refresh call here in the original I'm not sure is necessary
				
				minis.each(function() {
					// Looks like we're doing some scraping to get user IDs.
					var user_link = $(this).find("a.user-link[href*='user']:first");

					if(user_link && user_link.length){
						var user_id_match = user_link.attr("href").match(/\/user\/(\d+)\/?/i);

						if(user_id_match && user_id_match.length ==2) {
							var user_id = parseInt(user_id_match[1]);

							if (!user_id){
								return;
							}

							var user_exp = ember.getUserData(user_id).experience;

							ember.custom_experience_tpl($(this), user_exp, "", user_id, self)
						}
					}
				})
			}
		},

		show_in_profile: function(){
			var user_exp = ember.getUserData(this.params.user_id).experience;

			// We need an edit image. Get to that next.
			var edit_image = `<img class='exp-edit-image' src='${this.images.pencil}' title='Edit' />`;

			if(!this.is_allowed_to_edit_exp()) {
				edit_image = "";
			}

			var container = $("div.container.show-user");
			
			this.custom_experience_tpl(container, user_exp, edit_image, this.params.user_id, this);
		},

		bind_edit_dialog: function(element, user_id, update_selector, edit_image)
		{
			var self = this;
			var title = "Experience";

			element = $(element);

			if (yootil.key.write(ember.keyID, user_id) && yootil.user.is_staff() && this.is_allowed_to_edit_exp()) {
				var edit_html = "";

				edit_html += "<div class='ember-editing-container'>";
				edit_html += "	<div class='add-remove-title'>Add/Remove Exp</div>";
				edit_html += "	<button class='remove-exp-button' id='remove_experience'>Remove</button>";
				edit_html += "	<input class='add-remove-exp-field' type='text' name='add_remove_experience'/>";
				edit_html += "	<button class='add-exp-button' id='add_experience'>Add</button>";
				
				//edit_html += "	<hr class='hr'/>";
				edit_html += "	<div class='advanced-title section-header'><strong>Advanced</strong></div>";

				edit_html += "	<div class='set-exp-title'>Set Exp</div>";
				edit_html += "	<input class='set-exp-field' type='text' name='set_experience'/>";
				edit_html += "	<button class='set-exp-button' id='set_experience'>Set</button>";

				edit_html += "</div>";

				edit_html = $("<span />").html(edit_html);

				element.click(function(event) {
					pb.window.dialog("edit_experience", {
						
						title: ("Edit " + title),
						modal: true,
						height: 300,
						width: 300,
						resizeable: false,
						draggable: false,
						html: edit_html,

						open: function() {
							var key = "ember";

							// If I wanted a prefire event I could do that here.
						},

						buttons: {

							Close: function() {
								// If I wanted to fire an event on closing I could do that here.
								$(this).dialog("close");
							}
						}
					});
					
					// update_callback should be a function that takes two parameters:
					// 1) The old exp value, and
					// 2) The new value.
					// It retunrs the updated value.
					function processUpdate(button_id, field_name, update_callback)
					{
						$(edit_html).find(`button${button_id}`).click(function() {
							var field = $(this).parent().find(`input[name=${field_name}]`);
							var value = parseInt(field.val());
							if (isNaN(value)) return;

							var data = ember.getUserData(user_id);
							data.experience = update_callback(data.experience, value);
							ember.saveUserData(data, user_id);

							$(update_selector).html(data.experience + (edit_image ||""));
						});
					}

					processUpdate("#remove_experience", "add_remove_experience", function(oldVal, newVal) { return oldVal - newVal;});
					
					processUpdate("#add_experience", "add_remove_experience", function(oldVal, newVal) { return oldVal + newVal;});
					
					processUpdate("#set_experience", "set_experience", function(oldVal, newVal) { return newVal;});

				}).css("cursor", "pointer").attr("title", "Edit " + title);
			}

			return element;
		},

		is_allowed_to_edit_exp: function() {
			if (!yootil.user.logged_in() || !yootil.user.is_staff()){
				return false;
			}

			if (yootil.user.is_staff()) {
				return true;
			}
		},

		custom_experience_tpl: function(container, user_exp, edit_image, user_id, context) {
			var exp_cust = container.find(".ember_exp_amount");

			if(exp_cust.length)
			{
				exp_cust.append(user_exp + edit_image).addClass("ember_exp_amount_" + user_id);
				if (edit_image)
				{
					context.bind_edit_dialog(exp_cust, user_id, ".ember_exp_amount_" + user_id, edit_image);
				}
			}

			
		},

		checkMonthChanged: function(firstDate, secondDate)
		{
			return !(firstDate.getMonth() == secondDate.getMonth()
				&& firstDate.getFullYear() == secondDate.getFullYear());
		}
	};

	ember.init();
}