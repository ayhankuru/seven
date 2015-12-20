module.exports = {
     appname:'Foobar',
     template:{
       params:{
         title:`Uygulamada hata oluştu : {appname} `,
         year:new Date().getFullYear(),
         author:'ayhankuru'
       }
     },
     email:{
       transport:{
         service: 'Gmail',
         auth: {
             user: process.env.xgmailname,
             pass: process.env.xgmailpass
         }
       },
       list:['cobaimelan@gmail.com','cobaimelan@yandex.com.tr'],
       sender:' {appname}  <johndoe@gmail.com>',
       cron:'24 hour'
     },
     pushbullet:{
       apikey:process.env.pbulletapikey,
       message:` {appname} uygulamanızda hata oluştu, email adresinizi kontrol edin.`,
       devices:['browser']
     },
     slack:{
       apikey:process.env.slackapikey,
       message:` {appname} uygulamanızda hata oluştu, email adresinizi kontrol edin.`,
       channels:['general'],
       cron:'5 hour'
     }
}
