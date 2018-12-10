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
        console.log(">> Ember RP System ready!");
    }
}).init();