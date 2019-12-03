import pathUtil from 'path'
import docmatter from 'docmatter'

export function parseMDX(src: string) {
	const { content, body, header } = docmatter(src)
	const meta = header ? JSON.parse(header) : {}
	meta.tags = Array.isArray(meta.tags)
		? meta.tags
		: meta.tags
		? meta.tags.split(/\s*,\s*/)
		: []
	if (meta.date) meta.date = new Date(meta.date)
	return { meta, body: body || content, header }
}

// https://github.com/zeit/next-plugins/pull/389
interface NextConfig {
	[key: string]: any
}
interface PluginOptions {
	[key: string]: any
	extension?: RegExp
}
export function withMDX(
	nextConfig: NextConfig = {},
	pluginOptions: PluginOptions = {}
) {
	const extension = pluginOptions.extension || /\.mdx$/
	return Object.assign({}, nextConfig, {
		webpack(config: any, options: any) {
			if (!options.defaultLoaders) {
				throw new Error(
					'This plugin is not compatible with Next.js versions below 5.0.0 https://err.sh/next-plugins/upgrade'
				)
			}

			config.module.rules.push({
				test: extension,
				use: [
					options.defaultLoaders.babel,
					{
						loader: '@mdx-js/loader',
						options: pluginOptions.options
					},
					pathUtil.join(__dirname, '..', 'loader')
				]
			})

			if (typeof nextConfig.webpack === 'function') {
				return nextConfig.webpack(config, options)
			}

			return config
		}
	})
}

/* eslint prefer-rest-params:0 */
export function loadMDX(layouts: string) {
	return function(this: any, src: string) {
		let result = ''
		try {
			const callback = this.async()
			const { meta, body, header } = parseMDX(src)
			// not a document, probably a component
			if (!header) return callback(null, body)
			if (!meta.title) throw new Error('mdx document missing meta title')
			// is a document
			const useLayout = header && meta.layout !== false
			const layout = pathUtil.join(layouts, meta.layout || 'default')
			result = [
				useLayout && `import Layout from '${layout}'`,
				`export const meta = ${JSON.stringify(meta, null, '  ')}`,
				body,
				useLayout &&
					'export default ({ children }) => <Layout meta={meta}>{children}</Layout>'
			]
				.filter(i => i)
				.join('\n\n')
			return callback(null, result)
		} catch (err) {
			console.error('failure:', { err, result, this: this, arguments, src })
		}
	}
}
