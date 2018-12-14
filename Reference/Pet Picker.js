({
    images: {},
    settings: {},
    
    init: function(){
    	if(this.setup()) {
    		$(this.ready.bind(this));
		}
 	},
 
 	setup: function() {
    	var plugin = pb.plugin.get("pet_picker");
    	
    	if(plugin) {
            	this.settings = plugin.settings;
            	this.images = plugin.images;
            
           return true;
        }
    	return false;
	},
        
    ready: function() {
        console.log("pet picker ready start");
        if(pb.data("route").name == "user" || pb.data("route").name == "current_user") {
            var member_id = parseInt(pb.data("page").member.id, 10);
            var user_id = parseInt(pb.data("user").id, 10);
            
            if ((member_id == user_id) || pb.data("user").is_staff){
                this.add_button_to_profile();
            }
        } else {
            var route = (pb.data("route").name == "thread" || pb.data("route").name == "conversation" || pb.data("route").name == "all_recent_posts"
                         || pb.data("route").name == "search_results");
            if (route) {
                this.add_pet_image_to_mini_profiles();
                pb.events.on("afterSearch", this.add_pet_image_to_mini_profiles.bind(this));
            }
        }
        console.log("Pet picker ready finish");
    },
        
	add_button_to_profile: function() {
        console.log("Add profile button start");
        var $button = $("<a class='button' id='pet-picker-button' href='#' role='button'>Edit " + this.settings.pet_text + "</a>");
        var $conversation_button = $(".controls a.button[href^='/conversation/new/']");
        
        if($conversation_button.length) {
            $button.on("click", this.show_pet_dialog.bind(this));
            $button.insertAfter($conversation_button);
        }
        
        console.log("Add profile button stop");
    },
        
   add_pet_image_to_mini_profiles: function() {
       console.log("add pet to mini profiles start");
       
       var $mini_profiles = $(".mini-profile");
       
       if (!$mini_profiles.length) { return; }
       
       var my_key = pb.plugin.key("pet_name");
       
       var self=this;
       
       $mini_profiles.each(function(){
           var $mini_profile = $(this);
           var $user_link = $mini_profile.find("a.user-link[href*='user/']");
           var $info = $mini_profile.find(".info");
           
           if($info.length == 1 && $user_link.length == 1){
               var user_id_match = $user_link.attr("href").match(/\/user\/(\d+)\/?/i);
               
               if(!user_id_match || !parseInt(user_id_match[1], 10))  { return; }
               
               var user_id = parseInt(user_id_match[1], 10);
               var data = my_key.get(user_id);
               
               if(data){
                   var name = (data.name) ? data.name.toString().replace(/[^\w\s]+/g,"").substring(0, 40):"";
                   // var selected
                   var $elem = null;
                   
                   if(name)
                   {
                       $elem = $("<div>" + self.settings.pet_text + ": " + name + "</div>");
                   }
                   
                   if($elem){
                       $info.append($elem);
                   }
               }
           }
       });
       
       console.log("add pet to mini profiles finish");
   },
       
   update_user_pet: function() {
       console.log("Update pet start");
       
       var name=($("#pet-picker-name").val() || "").replace(/[^\w\s]+/g,"").substring(0,40);
       
       var my_key = pb.plugin.key("pet_name");
       var member_id = parseInt(pb.data("page").member.id, 10);
       
       my_key.set({
           object_id:member_id,
           value: {
               name: name
           }
       });
       
       console.log("Update pet finish: " + name);
   },
       
   show_pet_dialog: function() {
       console.log("show pet dialog start");
       
       pb.window.dialog("pet-picker-dialog", {
           	title: "Edit " + this.settings.pet_text,
           html: this.build_dialog_html(),
           modal: true,
           resizeable: false,
           height: 400,
           width: 500,
           
           buttons: [
               {
                   text: "Close",
                   click: function() {
                   $(this).dialog("close");
               		}
               },
               {
                   text:"Save",
                   click: this.update_user_pet
               }
           ]
       });
       
       console.log("show pet dialog finish");
       return false;
   },
       
   build_dialog_html: function(){
       var my_key=pb.plugin.key("pet_name");
       var member_id = parseInt(pb.data("page").member.id, 10);
       var data = my_key.get(member_id);
       var name="";
       var selected = "";
       
       if (data) {
           name = (data.name)? data.name.toString().replace(/[^\w\s]+/g,"").substring(0,40) : "";
       }
       
       var html = "";
       
       html += this.settings.pet_text + " Name: <input type='text' value='" + name + "' maxlength='40' id='pet-picker-name' />";
       //html += "<div class='pet-picker-images'>";
       
       //For loop that we're skipping because we're not doing images.
       // SAme for closing for loop.
       
       return html;
       
   }
}).init();