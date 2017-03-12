//https://github.com/slimjack/ExtJs-Utils

Ext.abstractFn = function (msgTpl) {
    var fn = function () {
        var thisMethodName = fn.$name;
        var callerMethodName = fn.caller.$name;
        if ((thisMethodName !== callerMethodName) && (callerMethodName !== 'callParent')) {
            var className = fn.caller.$owner.$className;
            var fullMethodName = className ? className + '.' + thisMethodName : thisMethodName;
            var message = Ext.String.format(msgTpl || "Method '{0}' is abstract and can't be called.", fullMethodName);
            Ext.Error.raise(message);
        }
    };
    return fn;
};

Ext.createIdleThrottled = function (fn, scope) {
    var _isIdleThrottledCallScheduled = false;
    var fnWrapper = function fnWrapper() {
        _isIdleThrottledCallScheduled = false;
        scope = scope || this;
        if (!scope.isDestroyed) {
            fn.apply(scope, arguments);
        }
    };
    return function () {
        if (!_isIdleThrottledCallScheduled) {
            _isIdleThrottledCallScheduled = true;
            fnWrapper.apply(this, arguments);
            // TODO temporary solution, remove line above and uncomment below after fixing updating _selectedComponents field
            //Ext.defer(fnWrapper, 1, this, arguments);
        }
    };
};
