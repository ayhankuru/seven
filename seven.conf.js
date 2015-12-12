module.exports = {
     appname:'Foobar',
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
         now:true
       }
     },
     pushbullet:{
       uri:process.env.bulletUri,
       apikey:process.env.bulletApikey,
       message:` {appname} uygulamanızda hata oluştu, email adresini kontrol edin.`,
       cron:{
         now:true
       }
     },
     hubot:{
       slackapikey:process.env.slackkey,
       message:` {appname} uygulamanızda hata oluştu, email adresini kontrol edin.`,
       cron:{
         now:true
       }
     }
}
