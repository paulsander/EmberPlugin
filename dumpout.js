function dumpout(obj) {
	function dumphelper(obj2, depth)
    {
		//console.log("Iteration [" + obj2 + "] [" + depth + "]");
		if (depth == 5) return;
		var pad = "";
		if (depth > 0)
        {
			pad = pad + " ";
			for(var i = 0; i < depth; i++)
            {
				pad = pad + ">";
            }
			pad = pad + " " ;
        }
		for(var propname in obj2)
        {
			console.log(pad + propname + ": " + obj2[propname]);
			
			if ("string" != typeof obj2[propname]) { 
				dumphelper(obj2[propname], depth + 1);
			}
        }
    }
	dumphelper(obj, 0);
}