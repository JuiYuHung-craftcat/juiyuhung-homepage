---
title: 'Hello World: How This Blog Works'
type: blog
date: '2026-10-03'
summary: >-
  A sample post showing the markdown format. Replace or delete it once you write
  your first real post.
---

This is a sample post. Every post is a markdown file in the `posts/` folder, and the file name becomes the URL. This one lives at `posts/hello-world.md`, so it is served at `/posts/hello-world`.

## Front matter

Each file starts with a small header:

```yaml
---
title: "Your post title"
type: tech            # shown as a tag, e.g. blog / tech / trading
date: "2026-10-03"    # posts are sorted newest first
summary: "Optional. Shown in the post list."
---
```

If `summary` is left out, the first paragraph is used instead.

## Formatting

Regular markdown works: **bold**, *italic*, `inline code`, [links](https://github.com/JuiYuHung-craftcat), and lists.

- Images go in `public/posts/<post-name>/` and are linked as `![alt](/posts/<post-name>/photo.jpg)`
- Code blocks keep their formatting

```verilog
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n) q <= '0;
  else        q <= d;
end
```

> Quotes look like this.

Tables work too:

| Strategy      | Return | Max drawdown |
| ------------- | -----: | -----------: |
| Buy & Hold    | +26.2% |       -28.7% |
| SMA Crossover |  +6.7% |        -9.5% |

### Publishing

Add the file, commit, and deploy. The post list and the page are generated at build time.
JY HERE!
