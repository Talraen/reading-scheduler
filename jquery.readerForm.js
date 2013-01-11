/**
* jQuery [ReaderForm] v1.0.0
* ReaderForm description
*/

(function($) {
	$.ReaderForm = function(element) {
		this.$element = $(element);

		this._init();
	};

	$.ReaderForm.settings = {
		cookieName: 'settings'
	};

	$.ReaderForm.prototype = {
		_init: function() {
			$.cookie.json = true;
			var readerForm = this;
			this.values = {};
			this.defaults = $.cookie($.ReaderForm.settings.cookieName) || {};
		
			this.$element.find('input').each(function() {
				var $input = $(this), eventType = 'change', value, name = $input.attr('name');
				switch ($input.attr('type')) {
					case 'checkbox':
						eventType = 'click';
						if (typeof readerForm.defaults[name] != 'undefined') {
							$input.prop('checked', readerForm.defaults[name]);
						}
						readerForm.values[name] = $input.prop('checked');
						break;

					case 'radio':
						eventType = 'click';
						if (typeof readerForm.defaults[name] != 'undefined') {
							$input.prop('checked', readerForm.defaults[name] == $input.val());
						}
						if ($input.prop('checked')) {
							readerForm.values[name] = $input.val();
						}
						break;

					case 'text':
						eventType = 'blur';
						if (typeof readerForm.defaults[name] != 'undefined') {
							$input.val(readerForm.defaults[name]);
						}
						readerForm.values[name] = $input.val();
						break;
						
					default:
						$.error('Invalid type ' + $input.attr('type'));
				}
				$input.on(eventType, function() {
					var $input = $(this);
					if ($input.attr('type') == 'checkbox') {
						readerForm.values[$input.attr('name')] = $input.prop('checked');
					} else {
						readerForm.values[$input.attr('name')] = $input.val();
					}
					readerForm._refresh();
				});
			});
			
			this._refresh();
		},
		
		_refresh: function() {
			$.cookie($.ReaderForm.settings.cookieName, this.values);
		}
	};

	$.fn.readerForm = function(option) {
		if (option) {
			var instance = $.data(this[0], 'readerForm');
			if (!instance) {
				$.error('Attempted to retrieve "' + option + '" from readerForm prior to initialization');
				return;
			}
			return instance.values[option];
		} else {
			this.each(function() {
				var instance = $.data(this, 'readerForm');
				if (!instance) {
					$.data(this, 'readerForm', new $.ReaderForm(this));
				}
			});
		}

		return this;
	};
})(jQuery);
