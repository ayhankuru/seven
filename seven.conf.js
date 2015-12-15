module.exports = {
     appname:'Foobar',
     timeout:12000,
     template:{
       path:__dirname+'/template/hero.tmp',
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
       cron:{
         now:false
       }
     },
     pushbullet:{
       apikey:process.env.pbulletapikey,
       devices:['browser'],
       message:` {appname} uygulamanızda hata oluştu, email adresinizi kontrol edin.`,
       cron:{
         now:false
       }
     },
     slack:{
       apikey:process.env.slackapikey,
       channels:['general'],
       users:['slackbot'],
       message:` {appname} uygulamanızda hata oluştu, email adresinizi kontrol edin.`,
       cron:{
         now:false
       }
     }
}
