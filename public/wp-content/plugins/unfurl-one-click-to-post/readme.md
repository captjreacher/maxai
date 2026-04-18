=== Unfurl - One Click To Post ===
Contributors: jmtdesign
Tags: twitter cards, open graph, meta tags, sharing, social sharing
Stable tag: trunk
Requires at least: 4.7.1
Tested up to: 4.7.3
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Donate link: 17ndaRFwzhC7DsVQSFqFhpoae9MkSsAsXC

== Description ==

**Make new post from a link in one click, like on Twitter**

Post content from an external publication with one click: Insert link to the input field in WordPress dashboard and a new post will be created.

It is similar to twitter cards - title, description and featured image is taken from metadata if there are any. The featured image gets downloaded into your own media library and set as a regular featured image.

Demo: [https://wp.tomatohunter.com/unfurl/](https://wp.tomatohunter.com/unfurl/)

== Screenshots ==

1. Wordpress Dashboard - Interface to paste links into

== Installation ==

This section describes how to install the plugin and get it working.

1. Upload the plugin files to the `/wp-content/plugins/plugin-name` directory, or install the plugin through the WordPress plugins screen directly.
1. Activate the plugin through the 'Plugins' screen in WordPress
1. Go to your WordPress dashboard to see the Unfurl input field, drag it to a more convenient place if necessary.

== Author ==

[bitbucket](https://bitbucket.org/xin_chao) | [www](http://le.galtender.com)

== Upgrade Notice ==

This plugin is still under development - the internets are wild and the metatags aren't perfect.

0.2.1    Added workaround for sharing LinkedIn Pulse, preliminary treatment for medium.com Cloudflare block.

== Changelog ==

Version

0.2.1    Added workaround for sharing LinkedIn Pulse, preliminary treatment for medium.com Cloudflare block.
0.1.2    Changed to Wordpress API for curl, added nonce for POST.
0.1.1    Added fix for badly formatted strings that are encoded into random chars.

Version (Preliminary)

20170407 All default functionality for test.
         Missing Wordpress backend messages when somethings wrong
         Image either twitter image src or <meta property="twitter:image"
20170406 Upload without featured image
20170405 Basic draft / prototype

== Frequently Asked Questions ==

1. The image/title from the site does not render, I get a default one.

This happens currently mainly for medium.com articles. This plugin is still under development - the internets are wild and the metatags aren't perfect.
