({
    images: {},
    settings: {},
    
    init: function(){
    	if(this.setup()) {
    		$(this.ready.bind(this));
		}
 	},
 
 	setup: function() {
    	var plugin = pb.plugin.get("YOUR_PLUGIN_NAME");
    	
    	if(plugin) {
            	this.settings = plugin.settings;
            	this.images = plugin.images;
            
           return true;
        }
    	return false;
	},
        
    ready: function() {
		// Code goes here
    }
}).init();