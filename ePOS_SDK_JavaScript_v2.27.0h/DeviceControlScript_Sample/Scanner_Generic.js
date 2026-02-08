exports.Scanner_Generic  = Scanner_Generic;

function Scanner_Generic(clientConnection, deviceConnection) {
	this.DEVICE_TYPE = 'type_scanner';
	this.DEVICE_GROUP = 'group_hid';
	this.KEY_DOWN = 1;
	this.VK_ENTER = 0x0D;

	this.clientConnection = clientConnection;
	this.deviceConnection = deviceConnection;
	this.message = '';
}
Scanner_Generic.prototype = {
	onDeviceData : function(event, keycode, ascii) {
		try {
			if (event == this.KEY_DOWN) {
				if( keycode == this.VK_ENTER ) {
					var data = {"input" : this.message};
					this.clientConnection.send('ondata', data);
					this.message = '';
				} else if ((ascii != null) && (ascii != '')) {
					this.message += ascii;
				}
			}
		}
		catch(e) {
		}
		return;
	}
};
