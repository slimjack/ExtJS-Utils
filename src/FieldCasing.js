Ext.define('Ext.ux.util.TextCasings', {
    alternateClassName: 'TextCasings',
    statics: {
        upper: 'upper',
        mixed: 'mixed',
        lower: 'lower'
    }
});

Ext.define('Ext.ux.util.FieldCasing', {
    alias: 'plugin.fieldcasing',
    extend: 'Ext.AbstractPlugin',

    toUpperCase: true,

    init: function (field) {
        var me = this;
        me.addFieldCasing(field);
    },

    addFieldCasing: function (field) {
        var me = this;
        var originalStyle = field.fieldStyle ? field.fieldStyle + ';' : '';
        Ext.override(field, {
            setCasing: function (casing) {
                this.casing = casing;
                if (this.casing === TextCasings.upper) {
                    field.setFieldStyle(originalStyle + "text-transform:uppercase");
                } else if (this.casing === TextCasings.lower) {
                    field.setFieldStyle(originalStyle + "text-transform:lowercase");
                } else {
                    field.setFieldStyle(originalStyle);
                }
            },

            getRawValue: function () {
                this.rawValue = this.callParent(arguments);
                if (this.casing === TextCasings.upper) {
                    this.rawValue = this.rawValue.toUpperCase();
                } else if (this.casing === TextCasings.lower) {
                    this.rawValue = this.rawValue.toLowerCase();
                }
                return this.rawValue;
            }
        });
        field.setCasing(field.casing);
    }
});