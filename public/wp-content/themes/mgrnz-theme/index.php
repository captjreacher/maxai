<?php get_header(); ?>
<main class="site-main" style="max-width:900px;margin:40px auto;padding:0 16px;">
  <h1><?php bloginfo('name'); ?></h1>
  <?php if (have_posts()) : while (have_posts()) : the_post(); ?>
    <article style="margin-bottom:32px;">
      <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
      <div><?php the_excerpt(); ?></div>
    </article>
  <?php endwhile; else: ?>
    <p>No posts yet. Add a post and refresh.</p>
  <?php endif; ?>
</main>
<?php get_footer(); ?>