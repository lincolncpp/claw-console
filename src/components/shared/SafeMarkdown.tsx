import ReactMarkdown, { defaultUrlTransform, type Components, type Options } from "react-markdown"

type SafeMarkdownProps = Omit<Options, "components" | "skipHtml" | "urlTransform"> & {
  components?: Components
}

const secureComponents: Components = {
  a: ({ href, ...props }) => (
    <a href={href} rel="noopener noreferrer nofollow" target="_blank" {...props} />
  ),
}

export function SafeMarkdown({ components, ...props }: SafeMarkdownProps) {
  return (
    <ReactMarkdown
      {...props}
      skipHtml
      disallowedElements={["img"]}
      urlTransform={defaultUrlTransform}
      components={{ ...components, ...secureComponents }}
    />
  )
}
