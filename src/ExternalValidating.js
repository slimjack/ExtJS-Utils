//https://github.com/slimjack/ExtJs-Utils

Ext.define('Ext.ux.plugin.ExternalValidating', {
    alias: 'plugin.externalvalidating',
    extend: 'Ext.AbstractPlugin',

    init: function (formField) {
        var me = this;
        var externalErrors = {};
        var ignoreExternal = false;
        if (!formField.isFormField) {
            Ext.Error.raise('ExternalValidating plugin may be applied only to form fields');
        }
        Ext.override(formField, {
            getErrors: function() {
                var errors = this.callParent(arguments);
                if (!ignoreExternal) {
                    Ext.Object.each(externalErrors, function(sourceName, errorMessages) {
                        errors = errors.concat(errorMessages);
                    });
                }
                return errors;
            },

            getInternalErrors: function() {
                ignoreExternal = true;
                var result = this.getErrors();
                ignoreExternal = false;
                return result;
            },

            setExternalErrors: function (sourceName, errorMessages) {
                externalErrors[sourceName] = errorMessages || [];
                formField.validate();
            }
        });
    }
});