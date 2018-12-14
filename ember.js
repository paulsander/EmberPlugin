({
    images: {},
    settings: {},
    
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

        console.log(">> Ember RP System ready!");
	},
	
	// 'this' is the monetary plug-in
	// 'm' might be posting mode? Full thread, full reply, quick reply?
	// 'c' is the current amount of points already being awarded
	// 'l' is 'plugin.settings.word_up.sort(function(a, b) {...}'
	// return value is the amount of bonus exp to award.
	wordcountcallback: function(wordcount_data, m, c, l) {
		return 3;
	}
}).init();