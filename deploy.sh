aws s3 cp ./website s3://bradroot-website --recursive --profile personal
aws cloudfront create-invalidation --distribution-id ECF0D5Y9L9T6X --paths "/*" --profile personal