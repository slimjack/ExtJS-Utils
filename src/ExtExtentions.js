Ext.abstractFn = function(msgTpl) {
    var fn = function() {
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
